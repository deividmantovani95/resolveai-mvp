// Persistence: acesso ao perfil profissional do prestador e à reputação
const { query } = require('./db');

const SELECT_PERFIL = `
  SELECT u.id, u.nome, u.email, u.telefone, u.cidade, u.ativo, u.criado_em,
         p.descricao, p.area_atendimento, p.status_aprovacao, p.avaliado_em,
         COALESCE(r.media, 0)::float AS media_avaliacoes,
         COALESCE(r.total, 0)::int   AS total_avaliacoes
  FROM prestador p
  JOIN usuario u ON u.id = p.usuario_id
  LEFT JOIN (
    SELECT prestador_id, ROUND(AVG(nota), 1) AS media, COUNT(*) AS total
    FROM avaliacao GROUP BY prestador_id
  ) r ON r.prestador_id = p.usuario_id`;

async function inserir(usuarioId, p, client = { query }) {
  await client.query(
    `INSERT INTO prestador (usuario_id, descricao, area_atendimento) VALUES ($1, $2, $3)`,
    [usuarioId, p.descricao, p.areaAtendimento]
  );
}

async function buscarPerfil(usuarioId) {
  const { rows } = await query(`${SELECT_PERFIL} WHERE p.usuario_id = $1`, [usuarioId]);
  return rows[0] || null;
}

async function atualizarPerfil(usuarioId, p, client = { query }) {
  await client.query(
    'UPDATE prestador SET descricao = $2, area_atendimento = $3 WHERE usuario_id = $1',
    [usuarioId, p.descricao, p.areaAtendimento]
  );
}

/** Lista prestadores para o painel administrativo, pendentes primeiro. */
async function listarParaModeracao() {
  const { rows } = await query(
    `${SELECT_PERFIL}
     WHERE u.ativo
     ORDER BY CASE p.status_aprovacao WHEN 'pendente' THEN 0 WHEN 'aprovado' THEN 1 ELSE 2 END,
              u.criado_em DESC`
  );
  return rows;
}

async function definirStatusAprovacao(usuarioId, status, adminId) {
  const { rowCount } = await query(
    `UPDATE prestador SET status_aprovacao = $2, avaliado_em = NOW(), avaliado_por = $3
     WHERE usuario_id = $1`,
    [usuarioId, status, adminId]
  );
  return rowCount > 0;
}

async function contarPorStatus() {
  const { rows } = await query(
    `SELECT status_aprovacao, COUNT(*)::int AS total
     FROM prestador p JOIN usuario u ON u.id = p.usuario_id
     WHERE u.ativo GROUP BY status_aprovacao`
  );
  return Object.fromEntries(rows.map((r) => [r.status_aprovacao, r.total]));
}

module.exports = {
  inserir, buscarPerfil, atualizarPerfil, listarParaModeracao, definirStatusAprovacao, contarPorStatus,
};
