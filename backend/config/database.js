
const oracledb = require('oracledb');

// Devolver filas como objetos { COLUMNA: valor } en vez de arrays
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// Validación temprana: si falta alguna variable, falla con mensaje claro

// pool de conexiones reutilizables
async function iniciarPool() {
    await oracledb.createPool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECT_STRING,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1
    });

    console.log('Conexión con Oracle XE establecida.');
}

// obtener una conexión del pool
async function obtenerConexion() {
    return await oracledb.getConnection();
}

// Cierre d el pool
async function cerrarPool() {
    await oracledb.getPool().close(10);
}

module.exports = {
    iniciarPool,
    obtenerConexion,
    cerrarPool
};
