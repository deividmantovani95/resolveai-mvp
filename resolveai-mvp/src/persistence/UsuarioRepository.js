// Persistence: acesso à tabela usuario (Cliente, Prestador e Administrador)
const { query } = require('./db');

const CAMPOS = `id, nome, email, telefone, cidade, tipo, ativo, aceite_termos_em, criado_em`;

async function buscarPorId(id) {
  const { rows } = await query(`SELECT ${CAMPOS} FROM usuario WHERE id = $1`, [id]);
  return rows[0] || null;
}

/** Retorna o usuário com o hash da senha (uso exclusivo do login). */
async function buscarParaLogin(email) {
  const { rows } = await query(
    `SELECT ${CAMPOS}, senha_hash FROM usuario WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return rows[0] || null;
}

async function emailEmUso(email, ignorarId = 0) {
  const { rows } = await query(
    'SELECT 1 FROM usuario WHERE LOWER(email) = LOWER($1) AND id <> $2',
    [email, ignorarId]
  );
  return rows.length > 0;
}

/** Insere um usuário. Aceita um client de transação opcional. */
async function inserir(u, client = { query }) {
  const { rows } = await client.query(
    `INSERT INTO usuario (nome, email, telefone, cidade, senha_hash, tipo, aceite_termos_em)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING ${CAMPOS}`,
    [u.nome, u.email, u.telefone, u.cidade, u.senhaHash, u.tipo]
  );
  return rows[0];
}

async function atualizarDados(id, u, client = { query }) {
  const { rows } = await client.query(
    `UPDATE usuario SET nome = $2, email = $3, telefone = $4, cidade = $5, atualizado_em = NOW()
     WHERE id = $1 RETURNING ${CAMPOS}`,
    [id, u.nome, u.email, u.telefone, u.cidade]
  );
  return rows[0];
}

async function buscarHashSenha(id) {
  const { rows } = await query('SELECT senha_hash FROM usuario WHERE id = $1', [id]);
  return rows[0] ? rows[0].senha_hash : null;
}

async function atualizarSenha(id, senhaHash) {
  await query('UPDATE usuario SET senha_hash = $2, atualizado_em = NOW() WHERE id = $1', [id, senhaHash]);
}

/**
 * Exclusão de conta (LGPD): os dados pessoais são anonimizados, mas os
 * registros de solicitações e avaliações são mantidos para preservar a
 * integridade do histórico dos outros usuários.
 */
async function anonimizar(id, senhaHashAleatoria, client = { query }) {
  await client.query(
    `UPDATE usuario SET nome = 'Usuário removido', email = 'removido-' || id || '@removido.invalid',
            telefone = NULL, cidade = NULL, senha_hash = $2, ativo = FALSE, atualizado_em = NOW()
     WHERE id = $1`,
    [id, senhaHashAleatoria]
  );
}

module.exports = {
  buscarPorId, buscarParaLogin, emailEmUso, inserir, atualizarDados,
  buscarHashSenha, atualizarSenha, anonimizar,
};
