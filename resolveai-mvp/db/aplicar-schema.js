// Cria (ou recria) as tabelas do banco a partir de db/schema.sql
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/persistence/db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Esquema aplicado com sucesso.');
  await pool.end();
})().catch((err) => {
  console.error('Erro ao aplicar o esquema:', err.message);
  process.exit(1);
});
