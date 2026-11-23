// Model: Prestador (perfil profissional e regras de aprovação)
const v = require('./validacao');

const STATUS_APROVACAO = Object.freeze({ PENDENTE: 'pendente', APROVADO: 'aprovado', REJEITADO: 'rejeitado' });

const ROTULO_APROVACAO = {
  pendente: 'Aguardando aprovação',
  aprovado: 'Aprovado',
  rejeitado: 'Não aprovado',
};

/** Valida os campos do perfil profissional (RF004/RF005). */
function validarPerfil(entrada) {
  const dados = {
    descricao: v.textoLongo(entrada.descricao, 600),
    areaAtendimento: v.texto(entrada.areaAtendimento, 160),
  };
  const erros = {};
  if (dados.descricao.length < 20) erros.descricao = 'Descreva sua experiência em pelo menos 20 caracteres.';
  if (dados.areaAtendimento.length < 3) erros.areaAtendimento = 'Informe as cidades ou bairros que você atende.';
  return { dados, erros };
}

/** Só prestadores aprovados aparecem na busca e recebem solicitações (RF016). */
function podeAtender(perfil) {
  return Boolean(perfil) && perfil.ativo !== false && perfil.status_aprovacao === STATUS_APROVACAO.APROVADO;
}

module.exports = { STATUS_APROVACAO, ROTULO_APROVACAO, validarPerfil, podeAtender };
