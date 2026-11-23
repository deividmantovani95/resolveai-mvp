// Model: Usuário (base de Cliente, Prestador e Administrador)
const v = require('./validacao');

const TIPOS = Object.freeze({ CLIENTE: 'cliente', PRESTADOR: 'prestador', ADMIN: 'admin' });

/**
 * Valida os dados pessoais comuns. Usado no cadastro (RF001/RF004)
 * e na edição (RF003/RF005).
 * @returns {{ dados: object, erros: object }}
 */
function validarDadosPessoais(entrada) {
  const dados = {
    nome: v.texto(entrada.nome, 120),
    email: v.texto(entrada.email, 160).toLowerCase(),
    telefone: v.telefone(entrada.telefone),
    cidade: v.texto(entrada.cidade, 80),
  };
  const erros = {};
  if (dados.nome.length < 3) erros.nome = 'Informe seu nome completo.';
  if (!v.emailValido(dados.email)) erros.email = 'Informe um e-mail válido.';
  if (!v.telefoneValido(dados.telefone)) erros.telefone = 'Informe o telefone com DDD (10 ou 11 dígitos).';
  if (dados.cidade.length < 2) erros.cidade = 'Informe sua cidade.';
  return { dados, erros };
}

/** Validação completa do cadastro: dados pessoais + senha + aceite dos termos. */
function validarCadastro(entrada) {
  const { dados, erros } = validarDadosPessoais(entrada);
  if (!v.senhaForte(entrada.senha)) {
    erros.senha = 'A senha deve ter de 8 a 72 caracteres, com letras e números.';
  } else if (entrada.senha !== entrada.confirmarSenha) {
    erros.confirmarSenha = 'As senhas não conferem.';
  }
  if (!entrada.aceiteTermos) {
    erros.aceiteTermos = 'É preciso aceitar os Termos de Uso e a Política de Privacidade.';
  }
  return { dados, erros };
}

function validarTrocaSenha(entrada) {
  const erros = {};
  if (!entrada.senhaAtual) erros.senhaAtual = 'Informe a senha atual.';
  if (!v.senhaForte(entrada.novaSenha)) erros.novaSenha = 'A nova senha deve ter de 8 a 72 caracteres, com letras e números.';
  else if (entrada.novaSenha !== entrada.confirmarSenha) erros.confirmarSenha = 'As senhas não conferem.';
  return erros;
}

/** Formata (19) 99999-9999 para exibição. */
function formatarTelefone(d) {
  if (!d) return '';
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

module.exports = { TIPOS, validarDadosPessoais, validarCadastro, validarTrocaSenha, formatarTelefone };
