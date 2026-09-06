const express = require('express');
const db = require('./database');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

const JWT_SECRET = 'SecureSDLC-Lab-Secret-2026';

app.use(express.json());

/* =========================================================
   RUTA PRINCIPAL
========================================================= */

app.get('/', (req, res) => {
    res.json({
        message: 'Secure SDLC Lab API',
        status: 'running'
    });
});


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        server: 'Windows Server',
        application: 'Node.js + Express'
    });
});


/* =========================================================
   LISTADO DE USUARIOS
========================================================= */

app.get('/api/users', (req, res) => {
    db.all(
        'SELECT id, username, role FROM users',
        [],
        (err, rows) => {

            if (err) {
                return res.status(500).json({
                    error: 'Error al consultar usuarios'
                });
            }

            res.json({
                users: rows
            });
        }
    );
});


/* =========================================================
   LOGIN Y GENERACIÓN DE JWT
========================================================= */

app.post('/api/login', (req, res) => {

    const { username, password } = req.body;

    db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, user) => {

            if (err) {
                return res.status(500).json({
                    error: 'Error interno'
                });
            }

            if (!user) {
                return res.status(401).json({
                    error: 'Credenciales inválidas'
                });
            }

            if (password !== user.password) {
                return res.status(401).json({
                    error: 'Credenciales inválidas'
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    username: user.username,
                    role: user.role
                },
                JWT_SECRET,
                {
                    algorithm: 'HS256',
                    expiresIn: '1h'
                }
            );

            res.json({
                message: 'Login correcto',
                token: token
            });
        }
    );
});


/* =========================================================
   MIDDLEWARE DE AUTENTICACIÓN JWT
========================================================= */

function authenticateToken(req, res, next) {

    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({
            error: 'Token requerido'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Formato de token inválido'
        });
    }

    jwt.verify(
        token,
        JWT_SECRET,
        {
            algorithms: ['HS256']
        },
        (err, user) => {

            if (err) {
                return res.status(403).json({
                    error: 'Token inválido o expirado'
                });
            }

            req.user = user;
            next();
        }
    );
}


/* =========================================================
   MIDDLEWARE RBAC
========================================================= */

function authorizeRole(role) {

    return (req, res, next) => {

        if (req.user.role !== role) {
            return res.status(403).json({
                error: 'Acceso denegado'
            });
        }

        next();
    };
}


/* =========================================================
   PERFIL PROTEGIDO
========================================================= */

app.get('/api/profile', authenticateToken, (req, res) => {

    res.json({
        message: 'Perfil protegido',
        user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role
        }
    });
});


/* =========================================================
   PANEL ADMINISTRATIVO PROTEGIDO POR RBAC
========================================================= */

app.get(
    '/api/admin',
    authenticateToken,
    authorizeRole('admin'),
    (req, res) => {

        res.json({
            message: 'Panel administrativo',
            user: req.user
        });
    }
);


/* =========================================================
   ENDPOINT BOLA / IDOR - INTENCIONALMENTE VULNERABLE
   SOLO PARA EL LABORATORIO EDUCATIVO

   Problema:
   valida JWT pero NO valida owner_id
========================================================= */

app.get('/api/records/:id', authenticateToken, (req, res) => {

    const recordId = req.params.id;

    db.get(
        'SELECT id, owner_id, title, content FROM records WHERE id = ? AND owner_id = ?',
        [recordId, req.user.id],
        (err, record) => {

            if (err) {
                return res.status(500).json({
                    error: 'Error interno'
                });
            }

            if (!record) {
                return res.status(404).json({
                    error: 'Registro no encontrado'
                });
            }

            res.json({
                record: record
            });
        }
    );
});


/* =========================================================
   ENDPOINT DEBUG TEMPORAL
   Sirve para confirmar los registros de SQLite.
   Lo quitaremos después.
========================================================= */

app.get('/api/debug/records', (req, res) => {

    db.all(
        'SELECT * FROM records',
        [],
        (err, rows) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                records: rows
            });
        }
    );
});

/* =========================================================
   ENDPOINT DELIBERADAMENTE VULNERABLE
========================================================= */


app.get('/api/search-user', authenticateToken, (req, res) => {
    const username = req.query.username;

    const query =
        'SELECT id, username, role FROM users WHERE username = ?';

    db.all(query, [username], (err, rows) => {
        if (err) {
            return res.status(500).json({
                error: 'Error en consulta',
            });
        }

        res.json({
            results: rows
        });
    });
});


/* =========================================================
   INICIO DEL SERVIDOR
========================================================= */

app.listen(PORT, '0.0.0.0', () => {
    console.log(`API ejecutándose en puerto ${PORT}`);
});