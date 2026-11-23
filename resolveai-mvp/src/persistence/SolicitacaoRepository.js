// Persistence: solicitações de contratação
const { query } = require('./db');

const SELECT_COMPLETO = `
  SELECT so.id, so.status, so.data_desejada, so.observacao, so.valor, so.criado_em, so.atualizado_em,
         so.cliente_id, so.prestador_id, so.servico_id,
         s.titulo AS servico_titulo, c.nome AS categoria_nome, c.slug AS categoria_slug,
         uc.nome AS cliente_nome, uc.telefone AS cliente_telefone, uc.cidade AS cliente_cidade,
         up.nome AS prestador_nome, up.telefone AS prestador_telefone,
         a.id AS avaliacao_id, a.nota AS avaliacao_nota
  FROM solicitacao so
  JOIN servico s    ON s.id = so.servico_id
  JOIN categoria c  ON c.id = s.categoria_id
  JOIN usuario uc   ON uc.id = so.cliente_id
  JOIN usuario up   ON up.id = so.prestador_id
  LEFT JOIN avaliacao a ON a.solicitacao_id = so.id`;

async function inserir(sol) {
  const { rows } = await query(
    `INSERT INTO solicitacao (cliente_id, servico_id, prestador_id, data_desejada, observacao, valor)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [sol.clienteId, sol.servicoId, sol.prestadorId, sol.dataDesejada, sol.observacao, sol.valor]
  );
  return rows[0].id;
}

async function buscarPorId(id) {
  const { rows } = await query(`${SELECT_COMPLETO} WHERE so.id = $1`, [id]);
  return rows[0] || null;
}

/**
 * Lista solicitações do usuário conforme o papel.
 * filtro: 'todas' | 'pendentes' (pendente/aceita/em_andamento) | 'concluidas' (concluida/recusada/cancelada)
 */
async function listarPorUsuario(usuarioId, papel, filtro = 'todas') {
  const coluna = papel === 'prestador' ? 'so.prestador_id' : 'so.cliente_id';
  let extra = '';
  if (filtro === 'pendentes') extra = `AND so.status IN ('pendente','aceita','em_andamento')`;
  if (filtro === 'concluidas') extra = `AND so.status IN ('concluida','recusada','cancelada')`;
  const { rows } = await query(
    `${SELECT_COMPLETO} WHERE ${coluna} = $1 ${extra}
     ORDER BY CASE so.status WHEN 'pendente' THEN 0 WHEN 'aceita' THEN 1 WHEN 'em_andamento' THEN 2 ELSE 3 END,
              so.criado_em DESC
     LIMIT 100`,
    [usuarioId]
  );
  return rows;
}

/**
 * Atualiza o status apenas se ele ainda for o esperado (evita que duas
 * ações simultâneas sobrescrevam uma à outra — RNF de integridade).
 */
async function atualizarStatus(id, statusAtual, novoStatus) {
  const { rowCount } = await query(
    'UPDATE solicitacao SET status = $3, atualizado_em = NOW() WHERE id = $1 AND status = $2',
    [id, statusAtual, novoStatus]
  );
  return rowCount > 0;
}

/** Cancela solicitações em aberto quando uma conta é excluída. */
async function cancelarAbertasDoUsuario(usuarioId, client = { query }) {
  await client.query(
    `UPDATE solicitacao SET status = 'cancelada', atualizado_em = NOW()
     WHERE (cliente_id = $1 OR prestador_id = $1) AND status IN ('pendente','aceita','em_andamento')`,
    [usuarioId]
  );
}

async function contarPendentesDoPrestador(prestadorId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM solicitacao WHERE prestador_id = $1 AND status = 'pendente'`,
    [prestadorId]
  );
  return rows[0].n;
}

module.exports = {
  inserir, buscarPorId, listarPorUsuario, atualizarStatus, cancelarAbertasDoUsuario, contarPendentesDoPrestador,
};
