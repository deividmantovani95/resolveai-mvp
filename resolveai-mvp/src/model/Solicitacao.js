// Model: Solicitação de contratação e sua máquina de estados
const v = require('./validacao');

const STATUS = Object.freeze({
  PENDENTE: 'pendente',
  ACEITA: 'aceita',
  EM_ANDAMENTO: 'em_andamento',
  CONCLUIDA: 'concluida',
  RECUSADA: 'recusada',
  CANCELADA: 'cancelada',
});

const ROTULO = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
};

/**
 * Transições permitidas por papel (RF011). Qualquer outra é recusada.
 *   pendente     -> aceita | recusada (prestador) ; cancelada (cliente)
 *   aceita       -> em_andamento (prestador)      ; cancelada (cliente ou prestador)
 *   em_andamento -> concluida (prestador)
 */
const TRANSICOES = {
  prestador: {
    pendente: ['aceita', 'recusada'],
    aceita: ['em_andamento', 'cancelada'],
    em_andamento: ['concluida'],
  },
  cliente: {
    pendente: ['cancelada'],
    aceita: ['cancelada'],
  },
};

function proximosStatus(statusAtual, papel) {
  return (TRANSICOES[papel] && TRANSICOES[papel][statusAtual]) || [];
}

function podeTransitar(statusAtual, novoStatus, papel) {
  return proximosStatus(statusAtual, papel).includes(novoStatus);
}

/** Valida os dados digitados pelo cliente ao solicitar (RF010). */
function validarPedido(entrada) {
  const dados = {
    dataDesejada: v.texto(entrada.dataDesejada, 10),
    observacao: v.textoLongo(entrada.observacao, 500),
  };
  const erros = {};
  if (!v.dataISOValida(dados.dataDesejada)) {
    erros.dataDesejada = 'Informe a data desejada.';
  } else {
    const hoje = v.hojeISO();
    const limite = new Date(`${hoje}T12:00:00Z`);
    limite.setUTCDate(limite.getUTCDate() + 180);
    if (dados.dataDesejada < hoje) erros.dataDesejada = 'A data não pode estar no passado.';
    else if (dados.dataDesejada > limite.toISOString().slice(0, 10)) erros.dataDesejada = 'Escolha uma data nos próximos 6 meses.';
  }
  return { dados, erros };
}

/** Verifica se o usuário logado participa da solicitação. */
function papelNaSolicitacao(sol, usuario) {
  if (!sol || !usuario) return null;
  if (sol.cliente_id === usuario.id) return 'cliente';
  if (sol.prestador_id === usuario.id) return 'prestador';
  return null;
}

function formatarData(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

module.exports = { STATUS, ROTULO, proximosStatus, podeTransitar, validarPedido, papelNaSolicitacao, formatarData };
