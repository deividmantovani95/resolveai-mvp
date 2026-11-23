// Model: funções utilitárias de validação e limpeza de dados de entrada

/** Remove espaços extras e limita o tamanho de um texto. */
function texto(valor, max = 255) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Texto longo: preserva quebras de linha. */
function textoLongo(valor, max = 2000) {
  return String(valor ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** Mantém só os dígitos e aceita telefones brasileiros com DDD (10 ou 11 dígitos). */
function telefone(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  return digitos;
}
function telefoneValido(digitos) {
  return /^\d{10,11}$/.test(digitos);
}

/** Política mínima de senha: 8+ caracteres com letras e números. */
function senhaForte(senha) {
  return typeof senha === 'string' && senha.length >= 8 && senha.length <= 72 &&
    /[A-Za-z]/.test(senha) && /\d/.test(senha);
}

/** Converte "1.234,56" ou "1234.56" em número; retorna NaN se inválido. */
function dinheiro(valor) {
  let s = String(valor ?? '').replace(/[R$\s]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Number(s);
}

/** Data de hoje no fuso de São Paulo, formato AAAA-MM-DD. */
function hojeISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function dataISOValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function inteiroPositivo(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

module.exports = {
  texto, textoLongo, emailValido, telefone, telefoneValido, senhaForte, dinheiro, hojeISO, dataISOValida, inteiroPositivo,
};
