// View: funções auxiliares disponíveis em todos os templates EJS
const { formatarPreco } = require('../model/Servico');
const { ROTULO, formatarData } = require('../model/Solicitacao');
const { ROTULO_APROVACAO } = require('../model/Prestador');
const { estrelas } = require('../model/Avaliacao');
const { formatarTelefone } = require('../model/Usuario');

const ICONES_CATEGORIA = {
  eletrica: 'raio', hidraulica: 'gota', reparos: 'martelo', informatica: 'monitor', montagem: 'chave',
};

function primeiroNome(nome) {
  return String(nome || '').split(' ')[0];
}

function iniciais(nome) {
  return String(nome || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function dataHora(d) {
  return new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
}

/** Link do WhatsApp para contato após o pedido ser aceito. */
function linkWhatsApp(telefone) {
  return telefone ? `https://wa.me/55${telefone}` : null;
}

module.exports = {
  formatarPreco, rotuloStatus: ROTULO, formatarData, rotuloAprovacao: ROTULO_APROVACAO, estrelas, formatarTelefone,
  ICONES_CATEGORIA, primeiroNome, iniciais, dataHora, linkWhatsApp,
};
