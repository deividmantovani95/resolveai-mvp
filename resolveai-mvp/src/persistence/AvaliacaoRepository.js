// Persistence: avaliações e reputação
const { query } = require('./db');

async function inserir(av) {
  const { rows } = await query(
    `INSERT INTO avaliacao (solicitacao_id, cliente_id, prestador_id, nota, comentario)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [av.solicitacaoId, av.clienteId, av.prestadorId, av.nota, av.comentario]
  );
  return rows[0].id;
}

async function listarDoPrestador(prestadorId, limite = 20) {
  const { rows } = await query(
    `SELECT a.id, a.nota, a.comentario, a.criado_em, u.nome AS cliente_nome, s.titulo AS servico_titulo
     FROM avaliacao a
     JOIN usuario u ON u.id = a.cliente_id
     JOIN solicitacao so ON so.id = a.solicitacao_id
     JOIN servico s ON s.id = so.servico_id
     WHERE a.prestador_id = $1
     ORDER BY a.criado_em DESC LIMIT $2`,
    [prestadorId, limite]
  );
  return rows;
}

/** Reputação = média das notas e quantidade de avaliações (RF014). */
async function reputacao(prestadorId) {
  const { rows } = await query(
    `SELECT COALESCE(ROUND(AVG(nota), 1), 0)::float AS media, COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE nota = 5)::int AS n5, COUNT(*) FILTER (WHERE nota = 4)::int AS n4,
            COUNT(*) FILTER (WHERE nota = 3)::int AS n3, COUNT(*) FILTER (WHERE nota = 2)::int AS n2,
            COUNT(*) FILTER (WHERE nota = 1)::int AS n1
     FROM avaliacao WHERE prestador_id = $1`,
    [prestadorId]
  );
  return rows[0];
}

module.exports = { inserir, listarDoPrestador, reputacao };
