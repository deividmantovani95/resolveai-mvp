// Testes unitários da camada Model (regras de negócio, sem banco de dados)
const test = require('node:test');
const assert = require('node:assert/strict');
const Usuario = require('../src/model/Usuario');
const Servico = require('../src/model/Servico');
const Solicitacao = require('../src/model/Solicitacao');
const Avaliacao = require('../src/model/Avaliacao');
const v = require('../src/model/validacao');

test('cadastro: exige senha forte, confirmação e aceite dos termos', () => {
  const base = { nome: 'Maria Teste', email: 'maria@x.com', telefone: '(19) 99999-0000', cidade: 'Mogi Mirim' };
  assert.deepEqual(Usuario.validarCadastro({ ...base, senha: 'abc12345', confirmarSenha: 'abc12345', aceiteTermos: '1' }).erros, {});
  assert.ok(Usuario.validarCadastro({ ...base, senha: 'abcdefgh', confirmarSenha: 'abcdefgh', aceiteTermos: '1' }).erros.senha);
  assert.ok(Usuario.validarCadastro({ ...base, senha: 'abc12345', confirmarSenha: 'outra123', aceiteTermos: '1' }).erros.confirmarSenha);
  assert.ok(Usuario.validarCadastro({ ...base, senha: 'abc12345', confirmarSenha: 'abc12345' }).erros.aceiteTermos);
  assert.ok(Usuario.validarCadastro({ ...base, email: 'invalido', senha: 'abc12345', confirmarSenha: 'abc12345', aceiteTermos: '1' }).erros.email);
});

test('telefone é normalizado para dígitos e formatado para exibição', () => {
  const { dados } = Usuario.validarDadosPessoais({ nome: 'Ana Lima', email: 'a@b.com', telefone: '(19) 98888-7777', cidade: 'Itapira' });
  assert.equal(dados.telefone, '19988887777');
  assert.equal(Usuario.formatarTelefone('19988887777'), '(19) 98888-7777');
});

test('preço aceita formato brasileiro e rejeita valores inválidos', () => {
  assert.equal(v.dinheiro('1.234,50'), 1234.5);
  assert.equal(v.dinheiro('90'), 90);
  assert.ok(Number.isNaN(v.dinheiro('abc')));
  const cats = [{ id: 1 }];
  assert.ok(Servico.validar({ titulo: 'Troca', categoriaId: '1', preco: '0', disponibilidade: 'Sáb', descricao: 'Descrição ok' }, cats).erros.preco);
  assert.ok(Servico.validar({ titulo: 'Troca de tomada', categoriaId: '9', preco: '50', disponibilidade: 'Sáb', descricao: 'Descrição ok' }, cats).erros.categoriaId);
});

test('máquina de estados da solicitação respeita o papel de cada ator', () => {
  assert.ok(Solicitacao.podeTransitar('pendente', 'aceita', 'prestador'));
  assert.ok(!Solicitacao.podeTransitar('pendente', 'aceita', 'cliente'));
  assert.ok(Solicitacao.podeTransitar('pendente', 'cancelada', 'cliente'));
  assert.ok(!Solicitacao.podeTransitar('pendente', 'concluida', 'prestador'));
  assert.ok(Solicitacao.podeTransitar('em_andamento', 'concluida', 'prestador'));
  assert.ok(!Solicitacao.podeTransitar('concluida', 'cancelada', 'cliente'));
  assert.deepEqual(Solicitacao.proximosStatus('concluida', 'prestador'), []);
});

test('data desejada não pode estar no passado', () => {
  assert.ok(Solicitacao.validarPedido({ dataDesejada: '2000-01-01' }).erros.dataDesejada);
  assert.ok(Solicitacao.validarPedido({ dataDesejada: '2026-02-30' }).erros.dataDesejada);
  assert.deepEqual(Solicitacao.validarPedido({ dataDesejada: v.hojeISO() }).erros, {});
});

test('avaliação: só o cliente, só concluída e só uma vez', () => {
  const sol = { cliente_id: 7, status: 'concluida', avaliacao_id: null };
  assert.equal(Avaliacao.motivoBloqueio(sol, 7), null);
  assert.ok(Avaliacao.motivoBloqueio(sol, 8));
  assert.ok(Avaliacao.motivoBloqueio({ ...sol, status: 'em_andamento' }, 7));
  assert.ok(Avaliacao.motivoBloqueio({ ...sol, avaliacao_id: 3 }, 7));
  assert.ok(Avaliacao.validar({ nota: '6' }).erros.nota);
  assert.deepEqual(Avaliacao.validar({ nota: '4' }).erros, {});
});

test('estrelas arredondam para meia estrela', () => {
  assert.deepEqual(Avaliacao.estrelas(4.3), { cheias: 4, meia: true, vazias: 0 });
  assert.deepEqual(Avaliacao.estrelas(4.8), { cheias: 5, meia: false, vazias: 0 });
  assert.deepEqual(Avaliacao.estrelas(0), { cheias: 0, meia: false, vazias: 5 });
});
