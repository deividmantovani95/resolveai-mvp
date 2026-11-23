// Model: Serviço oferecido por um prestador
const v = require('./validacao');

const PRECO_MAXIMO = 50000;

/** Valida o cadastro/edição de serviço (RF006/RF007). */
function validar(entrada, categoriasValidas) {
  const dados = {
    titulo: v.texto(entrada.titulo, 100),
    categoriaId: v.inteiroPositivo(entrada.categoriaId),
    preco: v.dinheiro(entrada.preco),
    disponibilidade: v.texto(entrada.disponibilidade, 160),
    descricao: v.textoLongo(entrada.descricao, 1000),
  };
  const erros = {};
  if (dados.titulo.length < 4) erros.titulo = 'Informe um título com pelo menos 4 caracteres.';
  if (!dados.categoriaId || !categoriasValidas.some((c) => c.id === dados.categoriaId)) {
    erros.categoriaId = 'Escolha uma categoria.';
  }
  if (Number.isNaN(dados.preco) || dados.preco <= 0 || dados.preco > PRECO_MAXIMO) {
    erros.preco = 'Informe um preço válido (ex.: 90,00).';
  }
  if (dados.disponibilidade.length < 3) erros.disponibilidade = 'Informe dias e horários de atendimento.';
  if (dados.descricao.length < 10) erros.descricao = 'Descreva o serviço em pelo menos 10 caracteres.';
  return { dados, erros };
}

function formatarPreco(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

module.exports = { validar, formatarPreco, PRECO_MAXIMO };
