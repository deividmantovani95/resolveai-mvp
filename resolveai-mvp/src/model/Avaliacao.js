// Model: Avaliação de um serviço concluído e regras de reputação
const v = require('./validacao');
const { STATUS } = require('./Solicitacao');

/** Valida nota (1 a 5) e comentário opcional (RF012). */
function validar(entrada) {
  const nota = Number(entrada.nota);
  const dados = { nota, comentario: v.textoLongo(entrada.comentario, 500) };
  const erros = {};
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) erros.nota = 'Escolha uma nota de 1 a 5 estrelas.';
  return { dados, erros };
}

/**
 * Regras de integridade (RF013): só o cliente da solicitação avalia,
 * só depois de concluída, e apenas uma vez.
 * @returns {string|null} motivo do bloqueio, ou null se pode avaliar
 */
function motivoBloqueio(solicitacao, usuarioId) {
  if (!solicitacao) return 'Solicitação não encontrada.';
  if (solicitacao.cliente_id !== usuarioId) return 'Apenas o cliente que contratou pode avaliar.';
  if (solicitacao.status !== STATUS.CONCLUIDA) return 'O serviço só pode ser avaliado depois de concluído.';
  if (solicitacao.avaliacao_id) return 'Esta solicitação já foi avaliada.';
  return null;
}

/** Converte média em estrelas inteiras/meias para exibição (RF014/RF015). */
function estrelas(media) {
  const arred = Math.round(Number(media || 0) * 2) / 2;
  return { cheias: Math.floor(arred), meia: arred % 1 !== 0, vazias: 5 - Math.ceil(arred) };
}

/** Selo exibido no perfil conforme a reputação. */
function selo(media, total) {
  if (total === 0) return 'Novo na plataforma';
  if (total >= 5 && media >= 4.5) return 'Muito bem avaliado';
  return null;
}

module.exports = { validar, motivoBloqueio, estrelas, selo };
