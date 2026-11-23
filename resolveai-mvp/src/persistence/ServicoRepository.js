// Persistence: serviços publicados pelos prestadores
const { query } = require('./db');

// Serviço só aparece para clientes se estiver ativo e o prestador estiver
// aprovado pelo administrador e com a conta ativa.
const VISIVEL = `s.ativo AND p.status_aprovacao = 'aprovado' AND u.ativo`;

const SELECT_COMPLETO = `
  SELECT s.id, s.titulo, s.descricao, s.preco, s.disponibilidade, s.ativo,
         s.prestador_id, s.categoria_id, c.slug AS categoria_slug, c.nome AS categoria_nome,
         u.nome AS prestador_nome, u.cidade AS prestador_cidade,
         p.area_atendimento, p.status_aprovacao,
         COALESCE(r.media, 0)::float AS media_avaliacoes,
         COALESCE(r.total, 0)::int   AS total_avaliacoes
  FROM servico s
  JOIN categoria c ON c.id = s.categoria_id
  JOIN prestador p ON p.usuario_id = s.prestador_id
  JOIN usuario  u ON u.id = s.prestador_id
  LEFT JOIN (
    SELECT prestador_id, ROUND(AVG(nota), 1) AS media, COUNT(*) AS total
    FROM avaliacao GROUP BY prestador_id
  ) r ON r.prestador_id = s.prestador_id`;

/**
 * Busca pública (RF008). Filtros opcionais: categoria e termo livre.
 * Paginada para manter o tempo de resposta baixo (RNF de desempenho).
 */
async function buscar({ categoriaId = null, termo = '', pagina = 1, porPagina = 12 }) {
  const params = [];
  const filtros = [VISIVEL];
  if (categoriaId) {
    params.push(categoriaId);
    filtros.push(`s.categoria_id = $${params.length}`);
  }
  if (termo) {
    params.push(`%${termo}%`);
    filtros.push(`(s.titulo ILIKE $${params.length} OR s.descricao ILIKE $${params.length} OR c.nome ILIKE $${params.length})`);
  }
  const where = filtros.join(' AND ');

  const total = await query(
    `SELECT COUNT(*)::int AS n FROM servico s
     JOIN categoria c ON c.id = s.categoria_id
     JOIN prestador p ON p.usuario_id = s.prestador_id
     JOIN usuario u ON u.id = s.prestador_id
     WHERE ${where}`,
    params
  );

  params.push(porPagina, (pagina - 1) * porPagina);
  const { rows } = await query(
    `${SELECT_COMPLETO} WHERE ${where}
     ORDER BY media_avaliacoes DESC, s.criado_em DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { itens: rows, total: total.rows[0].n, pagina, paginas: Math.max(1, Math.ceil(total.rows[0].n / porPagina)) };
}

/** Serviços mais bem avaliados para a tela inicial do cliente. */
async function destaques(limite = 4) {
  const { rows } = await query(
    `${SELECT_COMPLETO} WHERE ${VISIVEL}
     ORDER BY media_avaliacoes DESC, total_avaliacoes DESC, s.id DESC LIMIT $1`,
    [limite]
  );
  return rows;
}

/** Detalhe público (RF009): retorna null se o serviço não estiver visível. */
async function buscarVisivelPorId(id) {
  const { rows } = await query(`${SELECT_COMPLETO} WHERE s.id = $1 AND ${VISIVEL}`, [id]);
  return rows[0] || null;
}

/** Serviço de um prestador específico (para edição pelo dono). */
async function buscarDoPrestador(id, prestadorId) {
  const { rows } = await query(
    `${SELECT_COMPLETO} WHERE s.id = $1 AND s.prestador_id = $2 AND s.ativo`,
    [id, prestadorId]
  );
  return rows[0] || null;
}

async function listarDoPrestador(prestadorId) {
  const { rows } = await query(
    `${SELECT_COMPLETO} WHERE s.prestador_id = $1 AND s.ativo ORDER BY s.criado_em DESC`,
    [prestadorId]
  );
  return rows;
}

async function listarVisiveisDoPrestador(prestadorId) {
  const { rows } = await query(
    `${SELECT_COMPLETO} WHERE s.prestador_id = $1 AND ${VISIVEL} ORDER BY s.titulo`,
    [prestadorId]
  );
  return rows;
}

async function inserir(prestadorId, s) {
  const { rows } = await query(
    `INSERT INTO servico (prestador_id, categoria_id, titulo, descricao, preco, disponibilidade)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [prestadorId, s.categoriaId, s.titulo, s.descricao, s.preco, s.disponibilidade]
  );
  return rows[0].id;
}

/** Atualiza somente se o serviço pertencer ao prestador informado. */
async function atualizar(id, prestadorId, s) {
  const { rowCount } = await query(
    `UPDATE servico SET categoria_id = $3, titulo = $4, descricao = $5, preco = $6,
            disponibilidade = $7, atualizado_em = NOW()
     WHERE id = $1 AND prestador_id = $2 AND ativo`,
    [id, prestadorId, s.categoriaId, s.titulo, s.descricao, s.preco, s.disponibilidade]
  );
  return rowCount > 0;
}

/** Exclusão lógica: preserva o histórico de solicitações já feitas. */
async function desativar(id, prestadorId) {
  const { rowCount } = await query(
    'UPDATE servico SET ativo = FALSE, atualizado_em = NOW() WHERE id = $1 AND prestador_id = $2 AND ativo',
    [id, prestadorId]
  );
  return rowCount > 0;
}

async function desativarTodosDoPrestador(prestadorId, client = { query }) {
  await client.query('UPDATE servico SET ativo = FALSE WHERE prestador_id = $1', [prestadorId]);
}

module.exports = {
  buscar, destaques, buscarVisivelPorId, buscarDoPrestador, listarDoPrestador,
  listarVisiveisDoPrestador, inserir, atualizar, desativar, desativarTodosDoPrestador,
};
