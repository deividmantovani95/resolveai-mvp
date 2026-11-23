// Persistence: conexão com o PostgreSQL (pool de conexões compartilhado)
const { Pool, types } = require('pg');
const config = require('../config');

// NUMERIC (preços) chega como string no driver; convertemos para número.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
// DATE chega como texto 'AAAA-MM-DD' (evita deslocamento de fuso horário).
types.setTypeParser(1082, (v) => v);

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

/** Executa uma consulta parametrizada (protege contra SQL injection). */
function query(text, params) {
  return pool.query(text, params);
}

/** Executa várias operações dentro de uma transação. */
async function transacao(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transacao };
