// src/routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('./database');
const { generateToken, verifyToken, authorize, logActivity } = require('./auth');

// Rota de login
// Rota de login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM usuarios WHERE username = ? AND ativo = true', 
        [username], 
        async (err, user) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            // Atualizar último login
            db.run('UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

            const token = generateToken(user);
            res.json({ 
                token, 
                username: user.username,
                nome_completo: user.nome_completo,
                perfil: user.perfil 
            });

            logActivity(user.username, 'login', 'usuarios', user.id, 'Login realizado com sucesso');
        }
    );
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
        titular,
        dependentes
    } = req.body;

    // Iniciar transação
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        try {
            // Inserir movimentação do titular se houver planos selecionados
            if (titular && Object.values(titular.planos).some(p => p)) {
                db.run(`
                    INSERT INTO movimentacoes (
                        tipo,
                        matricula_titular,
                        nome_titular,
                        usuario_responsavel,
                        observacoes,
                        data_envio,
                        plano_unimed,
                        plano_uniodonto,
                        plano_bradesco_saude,
                        plano_bradesco_dental,
                        cartao_unimed,
                        cartao_uniodonto,
                        cartao_bradesco_saude,
                        cartao_bradesco_dental,
                        created_by,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
                `, [
                    tipo,
                    matricula_titular,
                    nome_titular,
                    usuario_responsavel,
                    observacoes,
                    titular.planos.unimed || false,
                    titular.planos.uniodonto || false,
                    titular.planos.bradesco_saude || false,
                    titular.planos.bradesco_dental || false,
                    titular.cartoes.unimed || null,
                    titular.cartoes.uniodonto || null,
                    titular.cartoes.bradesco_saude || null,
                    titular.cartoes.bradesco_dental || null,
                    req.user.username
                ]);
            }

            // Inserir movimentações dos dependentes
            if (dependentes && dependentes.length > 0) {
                const stmt = db.prepare(`
                    INSERT INTO movimentacoes (
                        tipo,
                        matricula_titular,
                        nome_titular,
                        nome_dependente,
                        usuario_responsavel,
                        observacoes,
                        data_envio,
                        plano_unimed,
                        plano_uniodonto,
                        plano_bradesco_saude,
                        plano_bradesco_dental,
                        cartao_unimed,
                        cartao_uniodonto,
                        cartao_bradesco_saude,
                        cartao_bradesco_dental,
                        created_by,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
                `);

                dependentes.forEach(dep => {
                    stmt.run([
                        tipo,
                        matricula_titular,
                        nome_titular,
                        dep.nome,
                        usuario_responsavel,
                        observacoes,
                        dep.planos.unimed || false,
                        dep.planos.uniodonto || false,
                        dep.planos.bradesco_saude || false,
                        dep.planos.bradesco_dental || false,
                        dep.cartoes.unimed || null,
                        dep.cartoes.uniodonto || null,
                        dep.cartoes.bradesco_saude || null,
                        dep.cartoes.bradesco_dental || null,
                        req.user.username
                    ]);
                });

                stmt.finalize();
            }

            db.run('COMMIT');
            
            logActivity(req.user.username, 'criar', 'movimentacoes', null, 
                `Nova movimentação registrada ${titular ? 'para ' + nome_titular : ''} ${dependentes ? 'com ' + dependentes.length + ' dependente(s)' : ''}`);
            
            res.json({ message: 'Movimentação registrada com sucesso' });
        } catch (error) {
            db.run('ROLLBACK');
            console.error('Erro ao registrar movimentação:', error);
            res.status(400).json({ error: error.message });
        }
    });
});

// Rota para listar movimentações
router.get('/movimentacoes', (req, res) => {
    db.all(`
        SELECT 
            m.*,
            ur.nome_completo as responsavel_nome,
            u.nome_completo as created_by_nome,
            ua.nome_completo as updated_by_nome
        FROM movimentacoes m
        LEFT JOIN usuarios ur ON m.usuario_responsavel = ur.username
        LEFT JOIN usuarios u ON m.created_by = u.username
        LEFT JOIN usuarios ua ON m.updated_by = ua.username
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
    
    const validFields = [
        'incluido_rateio',
        'incluido_fp760',
        'incluido_ir',
        'cartao_uniodonto_gerado',
        'status'
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

    db.run(updateSql, values, function(err) {
        if (err) {
            console.error('Erro ao atualizar movimentação:', err);
            return res.status(400).json({ error: err.message });
        }
        
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
        SELECT DISTINCT matricula_titular, nome_titular 
        FROM movimentacoes 
        WHERE nome_dependente IS NULL 
        ORDER BY nome_titular
    `, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Rota para obter uma movimentação específica
router.get('/movimentacoes/:id', (req, res) => {
    const { id } = req.params;
    
    db.get(`
        SELECT m.*, 
               (SELECT json_group_array(json_object(
                   'nome', d.nome_dependente,
                   'plano_unimed', d.plano_unimed,
                   'plano_uniodonto', d.plano_uniodonto,
                   'plano_bradesco_saude', d.plano_bradesco_saude,
                   'plano_bradesco_dental', d.plano_bradesco_dental,
                   'cartao_unimed', d.cartao_unimed,
                   'cartao_uniodonto', d.cartao_uniodonto,
                   'cartao_bradesco_saude', d.cartao_bradesco_saude,
                   'cartao_bradesco_dental', d.cartao_bradesco_dental
               ))
               FROM movimentacoes d 
               WHERE d.matricula_titular = m.matricula_titular 
               AND d.nome_dependente IS NOT NULL) as dependentes
        FROM movimentacoes m
        WHERE m.id = ?
    `, [id], (err, row) => {
        if (err) {
            console.error('Erro ao buscar movimentação:', err);
            return res.status(400).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Movimentação não encontrada' });
        }
        
        if (row.dependentes) {
            try {
                row.dependentes = JSON.parse(row.dependentes);
            } catch (e) {
                row.dependentes = [];
            }
        }
        
        res.json(row);
    });
});


module.exports = router;