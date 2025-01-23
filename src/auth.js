// src/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./database');

const SECRET_KEY = 'sua_chave_secreta_aqui'; // Em produção, usar variável de ambiente

function generateToken(user) {
    return jwt.sign({ 
        id: user.id, 
        username: user.username, 
        perfil: user.perfil 
    }, SECRET_KEY, { 
        expiresIn: '24h' 
    });
}

// Middleware de autenticação
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// Middleware de autorização baseado em perfil
function authorize(perfisPermitidos) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        if (!perfisPermitidos.includes(req.user.perfil)) {
            return res.status(403).json({ error: 'Acesso não autorizado' });
        }

        next();
    };
}

// Função para registrar log de atividade
function logActivity(usuario, acao, tabela, registro_id, detalhes) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO logs (usuario, acao, tabela, registro_id, detalhes, data_hora)
            VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
        `;
        
        db.run(sql, [usuario, acao, tabela, registro_id, detalhes], function(err) {
            if (err) {
                console.error('Erro ao registrar log:', err);
                reject(err);
                return;
            }
            resolve(this.lastID);
        });
    });
}

module.exports = { generateToken, verifyToken, authorize, logActivity };