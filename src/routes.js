// src/routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('./database');
const { generateToken, verifyToken, authorize, logActivity } = require('./auth');

// Rota de login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        db.get('SELECT * FROM usuarios WHERE username = ? AND ativo = true', 
            [username], 
            async (err, user) => {
                if (err) {
                    console.error('Erro na consulta:', err);
                    return res.status(400).json({ error: err.message });
                }

                if (!user) {
                    return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
                }

                const isValid = await bcrypt.compare(password, user.password);
                if (!isValid) {
                    return res.status(401).json({ error: 'Senha incorreta' });
                }

                // Gerar token
                const token = generateToken({
                    id: user.id,
                    username: user.username,
                    perfil: user.perfil
                });

                // Atualizar último login
                db.run('UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

                // Enviar resposta com token e dados do usuário
                res.json({ 
                    token,
                    username: user.username,
                    nome_completo: user.nome_completo,
                    perfil: user.perfil 
                });

                // Log de atividade
                logActivity(user.username, 'login', 'usuarios', user.id, 'Login realizado com sucesso');
            }
        );
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// Middleware de autenticação para rotas protegidas
router.use(verifyToken);

// Rotas de usuários (apenas master)
router.post('/usuarios', authorize(['master']), async (req, res) => {
    const { username, password, nome_completo, perfil } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(`
            INSERT INTO usuarios (username, password, nome_completo, perfil, created_by)
            VALUES (?, ?, ?, ?, ?)
        `, [username, hashedPassword, nome_completo, perfil, req.user.username], function(err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            
            logActivity(req.user.username, 'criar', 'usuarios', this.lastID, 'Novo usuário criado');
            res.json({ message: 'Usuário criado com sucesso' });
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/usuarios', authorize(['master']), (req, res) => {
    db.all('SELECT id, username, nome_completo, perfil, ativo, created_at, last_login FROM usuarios', [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

router.patch('/usuarios/:id', authorize(['master']), (req, res) => {
    const { id } = req.params;
    const { ativo, perfil, password } = req.body;
    
    let sql = 'UPDATE usuarios SET';
    const params = [];
    
    if (typeof ativo !== 'undefined') {
        sql += ' ativo = ?,';
        params.push(ativo);
    }
    if (perfil) {
        sql += ' perfil = ?,';
        params.push(perfil);
    }
    if (password) {
        sql += ' password = ?,';
        params.push(bcrypt.hashSync(password, 10));
    }
    
    sql = sql.slice(0, -1); // Remove última vírgula
    sql += ' WHERE id = ?';
    params.push(id);
    
    db.run(sql, params, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        logActivity(req.user.username, 'atualizar', 'usuarios', id, 'Usuário atualizado');
        res.json({ message: 'Usuário atualizado com sucesso' });
    });
});

// Rotas de movimentações

// Rota para criar movimentação
router.post('/movimentacoes', authorize(['master', 'editor']), async (req, res) => {
    const {
        tipo,
        matricula_titular,
        nome_titular,
        usuario_responsavel,
        observacoes,
        titular, // dados dos planos do titular
        dependentes
    } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        try {
            // Primeiro, verificar se o titular existe
            db.get('SELECT id, nome FROM titulares WHERE matricula = ?', [matricula_titular], (err, existingTitular) => {
                if (err) {
                    console.error('Erro ao buscar titular:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                const processarDependentes = (titularId) => {
                    let promises = [];
                    
                    // Se houver dados do titular, registrar movimentação do titular
                    if (titular && Object.values(titular.planos).some(p => p)) {
                        db.run(`
                            INSERT INTO movimentacoes (
                                tipo,
                                beneficiario_tipo,
                                titular_id,
                                usuario_responsavel,
                                observacoes,
                                created_by,
                                data_envio,
                                status
                            ) VALUES (?, 'titular', ?, ?, ?, ?, datetime('now', 'localtime'), 'enviado')
                        `, [
                            tipo,
                            titularId,
                            usuario_responsavel,
                            observacoes,
                            req.user.username
                        ], function(err) {
                            if (err) throw err;
                        });

                        // Atualizar planos do titular
                        db.run(`
                            UPDATE titulares SET
                            plano_unimed = ?,
                            plano_uniodonto = ?,
                            plano_bradesco_saude = ?,
                            plano_bradesco_dental = ?,
                            cartao_unimed = ?,
                            cartao_uniodonto = ?,
                            cartao_bradesco_saude = ?,
                            cartao_bradesco_dental = ?,
                            updated_at = datetime('now', 'localtime')
                            WHERE id = ?
                        `, [
                            titular.planos.unimed || false,
                            titular.planos.uniodonto || false,
                            titular.planos.bradesco_saude || false,
                            titular.planos.bradesco_dental || false,
                            titular.cartoes.unimed || null,
                            titular.cartoes.uniodonto || null,
                            titular.cartoes.bradesco_saude || null,
                            titular.cartoes.bradesco_dental || null,
                            titularId
                        ]);
                    }

                    // Processar dependentes se houver
                    if (dependentes && dependentes.length > 0) {
                        dependentes.forEach(dep => {
                            // Inserir dependente
                            db.run(`
                                INSERT INTO dependentes (
                                    titular_id,
                                    nome,
                                    grau_parentesco,
                                    plano_unimed,
                                    plano_uniodonto,
                                    plano_bradesco_saude,
                                    plano_bradesco_dental,
                                    cartao_unimed,
                                    cartao_uniodonto,
                                    cartao_bradesco_saude,
                                    cartao_bradesco_dental
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `, [
                                titularId,
                                dep.nome,
                                dep.grau_parentesco,
                                dep.planos.unimed || false,
                                dep.planos.uniodonto || false,
                                dep.planos.bradesco_saude || false,
                                dep.planos.bradesco_dental || false,
                                dep.cartoes.unimed || null,
                                dep.cartoes.uniodonto || null,
                                dep.cartoes.bradesco_saude || null,
                                dep.cartoes.bradesco_dental || null
                            ], function(err) {
                                if (err) throw err;

                                const dependenteId = this.lastID;

                                // Registrar movimentação do dependente
                                db.run(`
                                    INSERT INTO movimentacoes (
                                        tipo,
                                        beneficiario_tipo,
                                        titular_id,
                                        dependente_id,
                                        usuario_responsavel,
                                        observacoes,
                                        created_by,
                                        data_envio,
                                        status
                                    ) VALUES (?, 'dependente', ?, ?, ?, ?, ?, datetime('now', 'localtime'), 'enviado')
                                `, [
                                    tipo,
                                    titularId,
                                    dependenteId,
                                    usuario_responsavel,
                                    observacoes,
                                    req.user.username
                                ]);
                            });
                        });
                    }

                    // Commit após todas as operações
                    db.run('COMMIT', function(err) {
                        if (err) {
                            console.error('Erro ao commitar transação:', err);
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ message: 'Movimentação registrada com sucesso' });
                    });
                };

                // Se o titular não existe, criar primeiro
                if (!existingTitular) {
                    db.run(`
                        INSERT INTO titulares (
                            matricula,
                            nome,
                            plano_unimed,
                            plano_uniodonto,
                            plano_bradesco_saude,
                            plano_bradesco_dental,
                            cartao_unimed,
                            cartao_uniodonto,
                            cartao_bradesco_saude,
                            cartao_bradesco_dental,
                            active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)
                    `, [
                        matricula_titular,
                        nome_titular,
                        titular?.planos.unimed || false,
                        titular?.planos.uniodonto || false,
                        titular?.planos.bradesco_saude || false,
                        titular?.planos.bradesco_dental || false,
                        titular?.cartoes.unimed || null,
                        titular?.cartoes.uniodonto || null,
                        titular?.cartoes.bradesco_saude || null,
                        titular?.cartoes.bradesco_dental || null
                    ], function(err) {
                        if (err) {
                            console.error('Erro ao criar titular:', err);
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        processarDependentes(this.lastID);
                    });
                } else {
                    processarDependentes(existingTitular.id);
                }
            });
        } catch (error) {
            console.error('Erro na transação:', error);
            db.run('ROLLBACK');
            res.status(500).json({ error: error.message });
        }
    });
});

// Rota para listar movimentações
router.get('/movimentacoes', (req, res) => {
    db.all(`
        SELECT 
            m.*,
            t.matricula as matricula_titular,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.nome
                ELSE d.nome
            END as nome,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN 'Titular'
                ELSE d.grau_parentesco
            END as grau_parentesco,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.plano_unimed
                ELSE d.plano_unimed
            END as plano_unimed,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.plano_uniodonto
                ELSE d.plano_uniodonto
            END as plano_uniodonto,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.plano_bradesco_saude
                ELSE d.plano_bradesco_saude
            END as plano_bradesco_saude,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.plano_bradesco_dental
                ELSE d.plano_bradesco_dental
            END as plano_bradesco_dental,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.cartao_unimed
                ELSE d.cartao_unimed
            END as cartao_unimed,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.cartao_uniodonto
                ELSE d.cartao_uniodonto
            END as cartao_uniodonto,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.cartao_bradesco_saude
                ELSE d.cartao_bradesco_saude
            END as cartao_bradesco_saude,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.cartao_bradesco_dental
                ELSE d.cartao_bradesco_dental
            END as cartao_bradesco_dental,
            ur.nome_completo as responsavel_nome
        FROM movimentacoes m
        JOIN titulares t ON m.titular_id = t.id
        LEFT JOIN dependentes d ON m.dependente_id = d.id
        LEFT JOIN usuarios ur ON m.usuario_responsavel = ur.username
        ORDER BY m.created_at DESC
    `, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar movimentações:', err);
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Rota para atualizar status
router.patch('/movimentacoes/:id', authorize(['master', 'editor']), (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    //console.log('Dados recebidos:', updates)

    const validFields = [
        'incluido_rateio',
        'incluido_fp760',
        'incluido_ir',
        'cartao_uniodonto_gerado',
        'status',
        'plano_uniodonto',
        'cartao_uniodonto',
        'plano_unimed',
        'cartao_unimed',
        'plano_bradesco_saude',
        'cartao_bradesco_saude',
        'plano_bradesco_dental',
        'cartao_bradesco_dental'
    ];

    const setClause = Object.keys(updates)
        .filter(key => validFields.includes(key))
        .map(key => `${key} = ?`)
        .join(', ');

    const updateSql = `
        UPDATE movimentacoes 
        SET ${setClause},
            updated_at = datetime('now', 'localtime'),
            updated_by = ?
        WHERE id = ?`;

    const values = [
        ...Object.keys(updates)
            .filter(key => validFields.includes(key))
            .map(key => updates[key]),
        req.user.username,
        id
    ];

    //console.log('SQL gerado:', updateSql);
    //console.log('Valores:', values);

    db.run(updateSql, values, function(err) {
        if (err) {
            console.error('Erro ao atualizar movimentação:', err);
            return res.status(400).json({ error: err.message });
        }
        
        //console.log('Linhas afetadas:', this.changes);

        logActivity(req.user.username, 'atualizar', 'movimentacoes', id, 'Status atualizado');
        res.json({ message: 'Movimentação atualizada com sucesso' });
    });
});

// Rota para excluir movimentação
router.delete('/movimentacoes/:id', authorize(['master']), (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM movimentacoes WHERE id = ?', id, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        logActivity(req.user.username, 'excluir', 'movimentacoes', id, 'Movimentação excluída');
        res.json({ message: 'Movimentação excluída com sucesso' });
    });
});

// Rota para obter logs (apenas master)
router.get('/logs', authorize(['master']), (req, res) => {
    const { startDate, endDate, usuario, acao } = req.query;
    
    let sql = `
        SELECT 
            l.*,
            u.nome_completo as usuario_nome
        FROM logs l
        LEFT JOIN usuarios u ON l.usuario = u.username
        WHERE 1=1
    `;
    const params = [];

    if (startDate) {
        sql += ` AND date(l.data_hora) >= date(?)`;
        params.push(startDate);
    }
    if (endDate) {
        sql += ` AND date(l.data_hora) <= date(?)`;
        params.push(endDate);
    }
    if (usuario) {
        sql += ` AND l.usuario = ?`;
        params.push(usuario);
    }
    if (acao) {
        sql += ` AND l.acao = ?`;
        params.push(acao);
    }

    sql += ` ORDER BY l.data_hora DESC LIMIT 1000`;

    console.log('SQL Logs:', sql, params); // Debug

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar logs:', err);
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

//Rota para buscar titulares
router.get('/titulares', authorize(['master', 'editor']), (req, res) => {
    db.all(`
        SELECT 
            id, 
            matricula, 
            nome as nome_titular,
            plano_unimed,
            plano_uniodonto,
            plano_bradesco_saude,
            plano_bradesco_dental,
            cartao_unimed,
            cartao_uniodonto,
            cartao_bradesco_saude,
            cartao_bradesco_dental
        FROM titulares 
        WHERE active = true 
        ORDER BY nome
    `, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar titulares:', err);
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Rota para buscar informações detalhadas de um titular
router.get('/titulares/:matricula', authorize(['master', 'editor']), (req, res) => {
    const { matricula } = req.params;
    
    db.get(`
        SELECT 
            id,
            matricula,
            nome as nome_titular,
            plano_unimed,
            plano_uniodonto,
            plano_bradesco_saude,
            plano_bradesco_dental,
            cartao_unimed,
            cartao_uniodonto,
            cartao_bradesco_saude,
            cartao_bradesco_dental
        FROM titulares 
        WHERE matricula = ? AND active = true
    `, [matricula], (err, row) => {
        if (err) {
            console.error('Erro ao buscar titular:', err);
            return res.status(400).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Titular não encontrado' });
        }
        res.json(row);
    });
});

// Rota para obter uma movimentação específica
router.get('/movimentacoes/:id', (req, res) => {
    const { id } = req.params;
    
    db.get(`
        SELECT 
            m.*,
            t.matricula as matricula_titular,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.nome
                ELSE d.nome
            END as nome,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN 'Titular'
                ELSE d.grau_parentesco
            END as grau_parentesco,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.plano_unimed
                ELSE d.plano_unimed
            END as plano_unimed,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.plano_uniodonto
                ELSE d.plano_uniodonto
            END as plano_uniodonto,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.plano_bradesco_saude
                ELSE d.plano_bradesco_saude
            END as plano_bradesco_saude,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.plano_bradesco_dental
                ELSE d.plano_bradesco_dental
            END as plano_bradesco_dental,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.cartao_unimed
                ELSE d.cartao_unimed
            END as cartao_unimed,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.cartao_uniodonto
                ELSE d.cartao_uniodonto
            END as cartao_uniodonto,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.cartao_bradesco_saude
                ELSE d.cartao_bradesco_saude
            END as cartao_bradesco_saude,
            CASE 
                WHEN m.beneficiario_tipo = 'titular' THEN t.cartao_bradesco_dental
                ELSE d.cartao_bradesco_dental
            END as cartao_bradesco_dental,
            ur.nome_completo as responsavel_nome,
            m.incluido_rateio,
            m.incluido_fp760,
            m.incluido_ir,
            m.cartao_uniodonto_gerado,
            m.status
        FROM movimentacoes m
        JOIN titulares t ON m.titular_id = t.id
        LEFT JOIN dependentes d ON m.dependente_id = d.id
        LEFT JOIN usuarios ur ON m.usuario_responsavel = ur.username
        WHERE m.id = ?
    `, [id], (err, row) => {
        if (err) {
            console.error('Erro ao buscar movimentação:', err);
            return res.status(400).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Movimentação não encontrada' });
        }
        
        res.json(row);
    });
});


module.exports = router;