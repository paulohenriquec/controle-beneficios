const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const db = new sqlite3.Database(path.resolve(__dirname, 'beneficios.db'));

db.serialize(() => {
    // Tabela de Usuários com Perfis
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nome_completo TEXT NOT NULL,
        perfil TEXT NOT NULL CHECK (perfil IN ('master', 'editor', 'leitor')),
        ativo BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        last_login DATETIME
    )`);
    
    // Inserir usuário master padrão se não existir
    db.get("SELECT * FROM usuarios WHERE username = 'master'", [], async (err, row) => {
        if (!row) {
            const hashedPassword = await bcrypt.hash('master123', 10);
            db.run(`
                INSERT INTO usuarios (username, password, nome_completo, perfil) 
                VALUES ('master', ?, 'Administrador Master', 'master')
            `, [hashedPassword]);
        }
    });

    // Tabela de Titulares
    db.run(`CREATE TABLE IF NOT EXISTS titulares (
        matricula TEXT PRIMARY KEY,
        nome TEXT NOT NULL
    )`);

    // Tabela de Dependentes
    db.run(`CREATE TABLE IF NOT EXISTS dependentes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        matricula_titular TEXT,
        nome TEXT NOT NULL,
        FOREIGN KEY (matricula_titular) REFERENCES titulares(matricula)
    )`);

    // Tabela de Movimentações
    db.run(`CREATE TABLE IF NOT EXISTS movimentacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        matricula_titular TEXT NOT NULL,
        nome_titular TEXT NOT NULL,
        nome_dependente TEXT,
        usuario_responsavel TEXT NOT NULL,
        observacoes TEXT,
        data_envio DATETIME NOT NULL,
        plano_unimed BOOLEAN,
        plano_uniodonto BOOLEAN,
        plano_bradesco_saude BOOLEAN,
        plano_bradesco_dental BOOLEAN,
        cartao_unimed TEXT,
        cartao_uniodonto TEXT,
        cartao_bradesco_saude TEXT,
        cartao_bradesco_dental TEXT,
        incluido_rateio BOOLEAN DEFAULT FALSE,
        incluido_fp760 BOOLEAN DEFAULT FALSE,
        incluido_ir BOOLEAN DEFAULT FALSE,
        cartao_uniodonto_gerado BOOLEAN DEFAULT FALSE,
        created_by TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_by TEXT,
        updated_at DATETIME,
        FOREIGN KEY (usuario_responsavel) REFERENCES usuarios(username),
        FOREIGN KEY (created_by) REFERENCES usuarios(username),
        FOREIGN KEY (updated_by) REFERENCES usuarios(username)
    )`);

    // Logs de atividades
    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL,
        acao TEXT NOT NULL,
        tabela TEXT NOT NULL,
        registro_id INTEGER,
        detalhes TEXT,
        data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario) REFERENCES usuarios(username)
    )`);

});

module.exports = db;