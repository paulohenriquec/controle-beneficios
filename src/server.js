// src/server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const routes = require('./routes');

const app = express();
const port = 3000;

// Aumentar limite do body parser para requisições maiores
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Configurar CORS para desenvolvimento
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Rotas da API
app.use('/api', routes);

// Rota para as páginas HTML
app.get(['/', '/form.html', '/movimentacoes.html', '/usuarios.html', '/logs.html', '/status.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});