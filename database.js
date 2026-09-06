const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./secure_sdlc.db', (err) => {
    if (err) {
        console.error('Error al conectar con SQLite:', err.message);
    } else {
        console.log('Conectado correctamente a SQLite.');
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    `);

    db.run(`
        INSERT OR IGNORE INTO users (id, username, password, role)
        VALUES
        (1, 'alice', 'Password123!', 'user'),
        (2, 'bob', 'Password123!', 'user'),
        (3, 'admin', 'Admin123!', 'admin')
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            FOREIGN KEY(owner_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            FOREIGN KEY(owner_id) REFERENCES users(id)
        )
    `);
    
});

module.exports = db;