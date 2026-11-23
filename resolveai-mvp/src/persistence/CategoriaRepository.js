// Persistence: categorias de serviço
const { query } = require('./db');

let cache = null; // categorias quase nunca mudam; mantemos em memória

async function listar() {
  if (!cache) {
    const { rows } = await query('SELECT id, slug, nome FROM categoria ORDER BY ordem');
    cache = rows;
  }
  return cache;
}

async function buscarPorSlug(slug) {
  return (await listar()).find((c) => c.slug === slug) || null;
}

async function buscarPorId(id) {
  return (await listar()).find((c) => c.id === Number(id)) || null;
}

module.exports = { listar, buscarPorSlug, buscarPorId };
