console.log('Iniciando BrainChallenge...');
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const {
    iniciarPool,
    obtenerConexion,
    cerrarPool
} = require('./config/database');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
    res.json({ mensaje: 'API BrainChallenge funcionando' });
});

// Health check con Oracle
app.get('/api/health', async (req, res) => {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            'SELECT 1 AS CONEXION FROM DUAL'
        );

        res.json({
            estado: 'OK',
            mensaje: 'Conexión con Oracle correcta',
            oracle: resultado.rows   // ahora   [{ CONEXION: 1 }]
        });

    } catch (error) {
        console.error('Error de Oracle:', error.message);

        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo consultar Oracle',
            detalle: error.message   // quítaR 
        });

    } finally {
        if (conexion) {
            try { await conexion.close(); }
            catch (e) { console.error('Error al cerrar conexión:', e.message); }
        }
    }
});



// Listar usuarios (sin password_hash por seguridad)
app.get('/api/usuarios', async (req, res) => {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ID_USUARIO,
                    NOMBRE,
                    CORREO,
                    ROL,
                    TO_CHAR(FECHA_REGISTRO, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_REGISTRO
             FROM USUARIOS
             ORDER BY ID_USUARIO`,
            [],
            { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
        );

        res.json({
            estado: 'OK',
            total: resultado.rows.length,
            usuarios: resultado.rows
        });

    } catch (error) {
        console.error('Error al consultar USUARIOS:', error.message);

        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo consultar USUARIOS',
            detalle: error.message
        });

    } finally {
        if (conexion) {
            try { await conexion.close(); }
            catch (e) { console.error('Error al cerrar conexión:', e.message); }
        }
    }
});

const oracledb = require('oracledb');

//  NIVEL 1

// GET /api/usuarios/:id obtener un usuario 
app.get('/api/usuarios/:id', async (req, res) => {
    let conexion;
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            estado: 'ERROR',
            mensaje: 'ID inválido. Debe ser un número entero positivo.'
        });
    }

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ID_USUARIO,
                    NOMBRE,
                    CORREO,
                    ROL,
                    TO_CHAR(FECHA_REGISTRO, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_REGISTRO
             FROM USUARIOS
             WHERE ID_USUARIO = :id`,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                estado: 'ERROR',
                mensaje: `Usuario con ID ${id} no encontrado`
            });
        }

        res.json({ estado: 'OK', usuario: resultado.rows[0] });

    } catch (error) {
        console.error('Error al consultar USUARIO:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo consultar el usuario',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});

// GET /api/categorias  -listar categorías
app.get('/api/categorias', async (req, res) => {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ID_CATEGORIA, NOMBRE, DESCRIPCION
             FROM CATEGORIAS
             ORDER BY ID_CATEGORIA`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            estado: 'OK',
            total: resultado.rows.length,
            categorias: resultado.rows
        });

    } catch (error) {
        console.error('Error al consultar CATEGORIAS:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo consultar CATEGORIAS',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});

// GET /api/preguntas - listar preguntas (con nombre de categoría)
/*app.get('/api/preguntas', async (req, res) => {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT p.ID_PREGUNTA,
                    p.ENUNCIADO,
                    p.ESTADO,
                    p.ID_CATEGORIA,
                    c.NOMBRE AS CATEGORIA
             FROM PREGUNTAS p
             JOIN CATEGORIAS c ON c.ID_CATEGORIA = p.ID_CATEGORIA
             ORDER BY p.ID_PREGUNTA`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            estado: 'OK',
            total: resultado.rows.length,
            preguntas: resultado.rows
        });

    } catch (error) {
        console.error('Error al consultar PREGUNTAS:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo consultar PREGUNTAS',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});
*/

//  NIVEL 2

// GET /api/preguntas?categoria=1 - filtro por categoría (query param opcional)
app.get('/api/preguntas', async (req, res) => {
    let conexion;
    const categoria = req.query.categoria ? Number(req.query.categoria) : null;
    const buscar = req.query.buscar ? String(req.query.buscar).trim() : null;

    if (req.query.categoria && (!Number.isInteger(categoria) || categoria <= 0)) {
        return res.status(400).json({
            estado: 'ERROR',
            mensaje: 'Parámetro "categoria" inválido.'
        });
    }

    try {
        conexion = await obtenerConexion();

        const condiciones = [];
        const binds = {};

        if (categoria) {
            condiciones.push('p.ID_CATEGORIA = :categoria');
            binds.categoria = categoria;
        }
        if (buscar) {
            condiciones.push('LOWER(p.ENUNCIADO) LIKE :buscar');
            binds.buscar = `%${buscar.toLowerCase()}%`;
        }

        const where = condiciones.length > 0 ? 'WHERE ' + condiciones.join(' AND ') : '';

        const resultado = await conexion.execute(
            `SELECT p.ID_PREGUNTA,
                    p.ENUNCIADO,
                    p.ESTADO,
                    p.ID_CATEGORIA,
                    c.NOMBRE AS CATEGORIA
             FROM PREGUNTAS p
             JOIN CATEGORIAS c ON c.ID_CATEGORIA = p.ID_CATEGORIA
             ${where}
             ORDER BY p.ID_PREGUNTA`,
            binds,
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            estado: 'OK',
            filtro: { categoria, buscar },
            total: resultado.rows.length,
            preguntas: resultado.rows
        });

    } catch (error) {
        console.error('Error al consultar PREGUNTAS:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo consultar PREGUNTAS',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});


// GET /api/preguntas/:id/opciones - pregunta + sus opciones
app.get('/api/preguntas/:id/opciones', async (req, res) => {
    let conexion;
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            estado: 'ERROR',
            mensaje: 'ID inválido.'
        });
    }

    try {
        conexion = await obtenerConexion();

        // 1) Traer la pregunta
        const preguntaRes = await conexion.execute(
            `SELECT p.ID_PREGUNTA,
                    p.ENUNCIADO,
                    p.ESTADO,
                    p.ID_CATEGORIA,
                    c.NOMBRE AS CATEGORIA
             FROM PREGUNTAS p
             JOIN CATEGORIAS c ON c.ID_CATEGORIA = p.ID_CATEGORIA
             WHERE p.ID_PREGUNTA = :id`,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (preguntaRes.rows.length === 0) {
            return res.status(404).json({
                estado: 'ERROR',
                mensaje: `Pregunta con ID ${id} no encontrada`
            });
        }

        // 2) Traer sus opciones
        const opcionesRes = await conexion.execute(
            `SELECT ID_OPCION, DESCRIPCION, ES_CORRECTA
             FROM OPCIONES_RESPUESTA
             WHERE ID_PREGUNTA = :id
             ORDER BY ID_OPCION`,
            { id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            estado: 'OK',
            pregunta: preguntaRes.rows[0],
            opciones: opcionesRes.rows
        });

    } catch (error) {
        console.error('Error al consultar pregunta/opciones:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo consultar la pregunta',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});

// GET /api/preguntas-completas -preguntas con opciones anidadas (JOIN + agrupación en JS)
app.get('/api/preguntas-completas', async (req, res) => {
    let conexion;

    try {
        conexion = await obtenerConexion();

        //  pregunta + categoría + opciones en un solo JOIN
        const resultado = await conexion.execute(
            `SELECT p.ID_PREGUNTA,
                    p.ENUNCIADO,
                    p.ESTADO,
                    p.ID_CATEGORIA,
                    c.NOMBRE AS CATEGORIA,
                    o.ID_OPCION,
                    o.DESCRIPCION AS OPCION_DESCRIPCION,
                    o.ES_CORRECTA
             FROM PREGUNTAS p
             JOIN CATEGORIAS c ON c.ID_CATEGORIA = p.ID_CATEGORIA
             LEFT JOIN OPCIONES_RESPUESTA o ON o.ID_PREGUNTA = p.ID_PREGUNTA
             ORDER BY p.ID_PREGUNTA, o.ID_OPCION`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Agrupamos en JS: una fila por pregunta con array de opciones
        const mapa = new Map();

        for (const fila of resultado.rows) {
            if (!mapa.has(fila.ID_PREGUNTA)) {
                mapa.set(fila.ID_PREGUNTA, {
                    ID_PREGUNTA: fila.ID_PREGUNTA,
                    ENUNCIADO: fila.ENUNCIADO,
                    ESTADO: fila.ESTADO,
                    ID_CATEGORIA: fila.ID_CATEGORIA,
                    CATEGORIA: fila.CATEGORIA,
                    OPCIONES: []
                });
            }
            if (fila.ID_OPCION !== null) {
                mapa.get(fila.ID_PREGUNTA).OPCIONES.push({
                    ID_OPCION: fila.ID_OPCION,
                    DESCRIPCION: fila.OPCION_DESCRIPCION,
                    ES_CORRECTA: fila.ES_CORRECTA
                });
            }
        }

        const preguntas = Array.from(mapa.values());

        res.json({
            estado: 'OK',
            total: preguntas.length,
            preguntas
        });

    } catch (error) {
        console.error('Error al consultar preguntas-completas:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo consultar preguntas completas',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});

// POST /api/intentos → registrar intento
app.post('/api/intentos', async (req, res) => {
    let conexion;

    const {
        id_usuario,
        id_categoria,
        puntaje,
        total_preguntas,
        respuestas_correctas
    } = req.body || {};

    // Validaciones básicas
    if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'id_usuario inválido' });
    }
    if (!Number.isInteger(id_categoria) || id_categoria <= 0) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'id_categoria inválido' });
    }
    if (typeof puntaje !== 'number' || puntaje < 0 || puntaje > 100) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'puntaje debe ser número entre 0 y 100' });
    }
    if (!Number.isInteger(total_preguntas) || total_preguntas <= 0) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'total_preguntas inválido' });
    }
    if (!Number.isInteger(respuestas_correctas) || respuestas_correctas < 0 || respuestas_correctas > total_preguntas) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'respuestas_correctas inválido' });
    }

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `INSERT INTO INTENTOS
                (ID_USUARIO, ID_CATEGORIA, PUNTAJE, TOTAL_PREGUNTAS, RESPUESTAS_CORRECTAS)
             VALUES
                (:id_usuario, :id_categoria, :puntaje, :total_preguntas, :respuestas_correctas)
             RETURNING ID_INTENTO INTO :id_intento`,
            {
                id_usuario,
                id_categoria,
                puntaje,
                total_preguntas,
                respuestas_correctas,
                id_intento: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            },
            { autoCommit: true }
        );

        const idIntento = resultado.outBinds.id_intento[0];

        res.status(201).json({
            estado: 'OK',
            mensaje: 'Intento registrado',
            id_intento: idIntento,
            intento: {
                id_usuario,
                id_categoria,
                puntaje,
                total_preguntas,
                respuestas_correctas
            }
        });

    } catch (error) {
        console.error('Error al registrar intento:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo registrar el intento',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});

// GET /api/intentos → listar todos los intentos (con JOIN a usuarios y categorías)
app.get('/api/intentos', async (req, res) => {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT i.ID_INTENTO,
                    i.ID_USUARIO,
                    u.NOMBRE AS USUARIO,
                    i.ID_CATEGORIA,
                    c.NOMBRE AS CATEGORIA,
                    TO_CHAR(i.FECHA, 'YYYY-MM-DD HH24:MI:SS') AS FECHA,
                    i.PUNTAJE,
                    i.TOTAL_PREGUNTAS,
                    i.RESPUESTAS_CORRECTAS
             FROM INTENTOS i
             JOIN USUARIOS u ON u.ID_USUARIO = i.ID_USUARIO
             JOIN CATEGORIAS c ON c.ID_CATEGORIA = i.ID_CATEGORIA
             ORDER BY i.ID_INTENTO DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            estado: 'OK',
            total: resultado.rows.length,
            intentos: resultado.rows
        });

    } catch (error) {
        console.error('Error al consultar INTENTOS:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo consultar INTENTOS',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});

//probar face c
// GET /api/intentos/:idUsuario → intentos de un usuario concreto
app.get('/api/intentos/:idUsuario', async (req, res) => {
    let conexion;
    const idUsuario = Number(req.params.idUsuario);
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'idUsuario inválido.' });
    }
    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'limit inválido (1-100).' });
    }
    if (!Number.isInteger(offset) || offset < 0) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'offset inválido.' });
    }

    try {
        conexion = await obtenerConexion();

        const totalRes = await conexion.execute(
            `SELECT COUNT(*) AS TOTAL FROM INTENTOS WHERE ID_USUARIO = :idUsuario`,
            { idUsuario },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const total = totalRes.rows[0].TOTAL;

        const resultado = await conexion.execute(
            `SELECT i.ID_INTENTO,
                    i.ID_USUARIO,
                    u.NOMBRE AS USUARIO,
                    i.ID_CATEGORIA,
                    c.NOMBRE AS CATEGORIA,
                    TO_CHAR(i.FECHA, 'YYYY-MM-DD HH24:MI:SS') AS FECHA,
                    i.PUNTAJE,
                    i.TOTAL_PREGUNTAS,
                    i.RESPUESTAS_CORRECTAS
             FROM INTENTOS i
             JOIN USUARIOS u ON u.ID_USUARIO = i.ID_USUARIO
             JOIN CATEGORIAS c ON c.ID_CATEGORIA = i.ID_CATEGORIA
             WHERE i.ID_USUARIO = :idUsuario
             ORDER BY i.ID_INTENTO DESC
             OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
            { idUsuario, offset, limit },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            estado: 'OK',
            id_usuario: idUsuario,
            total,
            paginacion: { limit, offset, paginas: Math.ceil(total / limit) },
            intentos: resultado.rows
        });

    } catch (error) {
        console.error('Error al consultar intentos del usuario:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudieron consultar los intentos del usuario',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});


//  Estadísticas y ranking

// GET /api/estadisticas/:idUsuario → resumen estadístico del usuario
app.get('/api/estadisticas/:idUsuario', async (req, res) => {
    let conexion;
    const idUsuario = Number(req.params.idUsuario);
    const idCategoria = req.query.categoria ? Number(req.query.categoria) : null;

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'idUsuario inválido.' });
    }
    if (req.query.categoria && (!Number.isInteger(idCategoria) || idCategoria <= 0)) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'categoria inválida.' });
    }

    try {
        conexion = await obtenerConexion();

        const filtroCategoria = idCategoria ? 'AND ID_CATEGORIA = :idCategoria' : '';
        const filtroCategoriaJoin = idCategoria ? 'AND i.ID_CATEGORIA = :idCategoria' : '';
        const binds = idCategoria ? { idUsuario, idCategoria } : { idUsuario };

        const resumen = await conexion.execute(
            `SELECT COUNT(*) AS TOTAL_INTENTOS,
                    NVL(ROUND(AVG(PUNTAJE), 2), 0) AS PROMEDIO,
                    NVL(MAX(PUNTAJE), 0) AS MEJOR_PUNTAJE,
                    NVL(MIN(PUNTAJE), 0) AS PEOR_PUNTAJE,
                    NVL(SUM(RESPUESTAS_CORRECTAS), 0) AS TOTAL_ACIERTOS,
                    NVL(SUM(TOTAL_PREGUNTAS), 0) AS TOTAL_PREGUNTAS_JUGADAS
             FROM INTENTOS
             WHERE ID_USUARIO = :idUsuario ${filtroCategoria}`,
            binds,
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const porCategoria = await conexion.execute(
            `SELECT c.ID_CATEGORIA,
                    c.NOMBRE AS CATEGORIA,
                    COUNT(i.ID_INTENTO) AS INTENTOS,
                    ROUND(AVG(i.PUNTAJE), 2) AS PROMEDIO,
                    MAX(i.PUNTAJE) AS MEJOR
             FROM INTENTOS i
             JOIN CATEGORIAS c ON c.ID_CATEGORIA = i.ID_CATEGORIA
             WHERE i.ID_USUARIO = :idUsuario ${filtroCategoriaJoin}
             GROUP BY c.ID_CATEGORIA, c.NOMBRE
             ORDER BY c.NOMBRE`,
            binds,
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            estado: 'OK',
            id_usuario: idUsuario,
            filtro: idCategoria ? { id_categoria: idCategoria } : null,
            resumen: resumen.rows[0],
            por_categoria: porCategoria.rows
        });

    } catch (error) {
        console.error('Error al consultar estadísticas:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudieron consultar las estadísticas',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});

// GET /api/ranking → top 10 mejores intentos globales
app.get('/api/ranking', async (req, res) => {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT *
             FROM (
                SELECT u.NOMBRE AS USUARIO,
                       c.NOMBRE AS CATEGORIA,
                       i.PUNTAJE,
                       i.RESPUESTAS_CORRECTAS,
                       i.TOTAL_PREGUNTAS,
                       TO_CHAR(i.FECHA, 'YYYY-MM-DD HH24:MI:SS') AS FECHA
                FROM INTENTOS i
                JOIN USUARIOS u ON u.ID_USUARIO = i.ID_USUARIO
                JOIN CATEGORIAS c ON c.ID_CATEGORIA = i.ID_CATEGORIA
                ORDER BY i.PUNTAJE DESC, i.RESPUESTAS_CORRECTAS DESC
             )
             WHERE ROWNUM <= 10`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            estado: 'OK',
            total: resultado.rows.length,
            ranking: resultado.rows
        });

    } catch (error) {
        console.error('Error al consultar ranking:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo consultar el ranking',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});



// POST /api/login en login simple (comparación directa, sin bcrypt)
app.post('/api/login', async (req, res) => {
    let conexion;
    const { correo, password } = req.body || {};

    if (!correo || !password) {
        return res.status(400).json({
            estado: 'ERROR',
            mensaje: 'Correo y contraseña son obligatorios'
        });
    }

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT ID_USUARIO, NOMBRE, CORREO, ROL, PASSWORD_HASH
             FROM USUARIOS
             WHERE LOWER(CORREO) = LOWER(:correo)`,
            { correo },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                estado: 'ERROR',
                mensaje: 'Credenciales incorrectas'
            });
        }

        const usuario = resultado.rows[0];

        // Comparación directa (SIN bcrypt, solo para demo rápida)
        if (usuario.PASSWORD_HASH !== password) {
            return res.status(401).json({
                estado: 'ERROR',
                mensaje: 'Credenciales incorrectas'
            });
        }

        res.json({
            estado: 'OK',
            mensaje: 'Login correcto',
            usuario: {
                id_usuario: usuario.ID_USUARIO,
                nombre: usuario.NOMBRE,
                correo: usuario.CORREO,
                rol: usuario.ROL
            }
        });

    } catch (error) {
        console.error('Error al hacer login:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo procesar el login',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});

// POST /api/registro → crear nuevo usuario
app.post('/api/registro', async (req, res) => {
    let conexion;
    const { nombre, correo, password } = req.body || {};

    // Validaciones
    if (!nombre || nombre.trim().length < 3) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'Nombre muy corto (mínimo 3 caracteres)' });
    }
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'Correo inválido' });
    }
    if (!password || password.length < 6) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'Contraseña muy corta (mínimo 6 caracteres)' });
    }

    try {
        conexion = await obtenerConexion();

        // Verificar que el correo no exista
        const existe = await conexion.execute(
            `SELECT ID_USUARIO FROM USUARIOS WHERE LOWER(CORREO) = LOWER(:correo)`,
            { correo },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (existe.rows.length > 0) {
            return res.status(409).json({ estado: 'ERROR', mensaje: 'Ese correo ya está registrado' });
        }

        // Insertar
        const resultado = await conexion.execute(
            `INSERT INTO USUARIOS (NOMBRE, CORREO, PASSWORD_HASH, ROL)
             VALUES (:nombre, :correo, :password, 'USUARIO')
             RETURNING ID_USUARIO INTO :id_usuario`,
            {
                nombre: nombre.trim(),
                correo: correo.trim().toLowerCase(),
                password,
                id_usuario: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            },
            { autoCommit: true }
        );

        const nuevoId = resultado.outBinds.id_usuario[0];

        res.status(201).json({
            estado: 'OK',
            mensaje: 'Usuario creado correctamente',
            usuario: {
                id_usuario: nuevoId,
                nombre: nombre.trim(),
                correo: correo.trim().toLowerCase(),
                rol: 'USUARIO'
            }
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudo registrar el usuario',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});

// GET /api/logs -  últimos 50 logs de auditoría
app.get('/api/logs', async (req, res) => {
    let conexion;

    try {
        conexion = await obtenerConexion();

        const resultado = await conexion.execute(
            `SELECT l.ID_LOG,
                    l.ID_USUARIO,
                    u.NOMBRE AS USUARIO,
                    l.ACCION,
                    l.DETALLE,
                    TO_CHAR(l.FECHA, 'YYYY-MM-DD HH24:MI:SS') AS FECHA
             FROM LOGS_ACCESO l
             LEFT JOIN USUARIOS u ON u.ID_USUARIO = l.ID_USUARIO
             ORDER BY l.ID_LOG DESC
             FETCH FIRST 50 ROWS ONLY`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            estado: 'OK',
            total: resultado.rows.length,
            logs: resultado.rows
        });

    } catch (error) {
        console.error('Error al consultar LOGS_ACCESO:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'No se pudieron consultar los logs',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});

// POST /api/intentos-completo → transacción manual (INTENTOS + RESPUESTAS_DETALLE)
app.post('/api/intentos-completo', async (req, res) => {
    let conexion;
    const { id_usuario, id_categoria, puntaje, total_preguntas, respuestas_correctas, respuestas } = req.body || {};

    // Validaciones básicas
    if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'id_usuario inválido' });
    }
    if (!Array.isArray(respuestas) || respuestas.length === 0) {
        return res.status(400).json({ estado: 'ERROR', mensaje: 'respuestas requeridas' });
    }

    try {
        conexion = await obtenerConexion();

        // ⚠️ SIN autoCommit → transacción manual
        // 1. INSERT cabecera
        const resultIntento = await conexion.execute(
            `INSERT INTO INTENTOS
                (ID_USUARIO, ID_CATEGORIA, PUNTAJE, TOTAL_PREGUNTAS, RESPUESTAS_CORRECTAS)
             VALUES
                (:id_usuario, :id_categoria, :puntaje, :total_preguntas, :respuestas_correctas)
             RETURNING ID_INTENTO INTO :id_intento`,
            {
                id_usuario,
                id_categoria,
                puntaje,
                total_preguntas,
                respuestas_correctas,
                id_intento: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            }
            // ⚠️ Sin autoCommit: true
        );

        const idIntento = resultIntento.outBinds.id_intento[0];

        // 2. INSERT detalles (una por respuesta)
        for (const r of respuestas) {
            await conexion.execute(
                `INSERT INTO RESPUESTAS_DETALLE
                    (ID_INTENTO, ID_PREGUNTA, ID_OPCION, ES_CORRECTA)
                 VALUES
                    (:id_intento, :id_pregunta, :id_opcion, :es_correcta)`,
                {
                    id_intento: idIntento,
                    id_pregunta: r.id_pregunta,
                    id_opcion: r.id_opcion,
                    es_correcta: r.es_correcta ? 1 : 0
                }
                // ⚠️ Sin autoCommit
            );
        }

        // 3. COMMIT manual (si todo fue bien)
        await conexion.commit();

        res.status(201).json({
            estado: 'OK',
            mensaje: 'Intento y detalles guardados (transacción manual)',
            id_intento: idIntento,
            total_detalles: respuestas.length
        });

    } catch (error) {
        // ⚠️ ROLLBACK manual (si algo falló)
        if (conexion) {
            try { await conexion.rollback(); } catch (e) { console.error('Error en rollback:', e.message); }
        }
        console.error('Error en transacción:', error.message);
        res.status(500).json({
            estado: 'ERROR',
            mensaje: 'Transacción fallida, se hizo ROLLBACK',
            detalle: error.message
        });
    } finally {
        if (conexion) {
            try { await conexion.close(); } catch (e) { console.error(e.message); }
        }
    }
});

// Arranque
async function iniciarServidor() {
    try {
        await iniciarPool();

        const PORT = process.env.PORT || 3000;

        const server = app.listen(PORT, () => {
            console.log(`BrainChallenge activo en http://localhost:${PORT}`);
        });

        // Cierre limpio
        const apagar = async () => {
            console.log('Apagando servidor...');
            server.close();
            await cerrarPool();
            process.exit(0);
        };

        process.on('SIGINT', apagar);
        process.on('SIGTERM', apagar);

    } catch (error) {
        console.error('Error al iniciar:', error.message);
        process.exit(1);
    }
}

iniciarServidor();