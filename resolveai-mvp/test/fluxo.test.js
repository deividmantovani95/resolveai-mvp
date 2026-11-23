// Teste de integração: percorre os fluxos do cliente, do prestador e do administrador
// usando o banco PostgreSQL real. Usa o banco definido em TEST_DATABASE_URL
// (padrão: resolveai_teste), que é APAGADO e recriado a cada execução.
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/resolveai_teste';

const raiz = path.join(__dirname, '..');
execFileSync('node', ['db/aplicar-schema.js'], { cwd: raiz, env: process.env, stdio: 'ignore' });
execFileSync('node', ['db/seed.js'], { cwd: raiz, env: process.env, stdio: 'ignore' });

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/persistence/db');

/** Navegador simulado: guarda o cookie de sessão e o token CSRF. */
function navegador() {
  const agente = request.agent(app);
  let csrf = '';
  const capturar = (res) => {
    const m = res.text && res.text.match(/name="_csrf" value="([a-f0-9]+)"/);
    if (m) csrf = m[1];
    return res;
  };
  return {
    get: async (url) => capturar(await agente.get(url)),
    post: async (url, dados = {}) => {
      if (!csrf) await agente.get('/login').then(capturar);
      const res = capturar(await agente.post(url).type('form').send({ _csrf: csrf, ...dados }));
      // como um navegador, segue o redirecionamento (o token CSRF muda após o login)
      if (res.status === 302) await agente.get(res.headers.location).then(capturar);
      return res;
    },
    postSemCsrf: (url, dados) => agente.post(url).type('form').send(dados),
  };
}

async function entrar(email) {
  const n = navegador();
  const res = await n.post('/login', { email, senha: 'Senha123' });
  assert.equal(res.status, 302, `login de ${email}`);
  return n;
}

test.after(() => pool.end());

test('RF002: login com senha errada é recusado com mensagem genérica', async () => {
  const n = navegador();
  const res = await n.post('/login', { email: 'carlos@exemplo.com', senha: 'errada123' });
  assert.equal(res.status, 401);
  assert.match(res.text, /E-mail ou senha incorretos/);
});

test('RNF segurança: POST sem token CSRF é bloqueado', async () => {
  const n = navegador();
  const res = await n.postSemCsrf('/login', { email: 'carlos@exemplo.com', senha: 'Senha123' });
  assert.equal(res.status, 403);
});

test('RF001/RF003: cliente se cadastra e edita seus dados', async () => {
  const n = navegador();
  let res = await n.post('/cadastro', {
    nome: 'Bruna Teste', email: 'bruna@teste.com', telefone: '19912345678', cidade: 'Mogi Mirim',
    senha: 'segura123', confirmarSenha: 'segura123', aceiteTermos: '1',
  });
  assert.equal(res.status, 302);
  res = await n.post('/cadastro', {
    nome: 'Outra', email: 'BRUNA@teste.com', telefone: '19912345678', cidade: 'X', senha: 'segura123', confirmarSenha: 'segura123', aceiteTermos: '1',
  });
  // já logado, mas o e-mail duplicado deve ser recusado
  assert.equal(res.status, 422);
  assert.match(res.text, /já está cadastrado/);
  res = await n.post('/perfil', { nome: 'Bruna Teste Silva', email: 'bruna@teste.com', telefone: '19912345678', cidade: 'Mogi Guaçu' });
  assert.equal(res.status, 302);
  res = await n.get('/perfil');
  assert.match(res.text, /Bruna Teste Silva/);
});

test('RF004/RF006/RF016: prestador novo só aparece na busca após aprovação', async () => {
  const p = navegador();
  let res = await p.post('/cadastro/prestador', {
    nome: 'Paulo Prestador', email: 'paulo@teste.com', telefone: '19987654321', cidade: 'Mogi Mirim',
    areaAtendimento: 'Mogi Mirim', descricao: 'Encanador com dez anos de experiência em residências.',
    senha: 'segura123', confirmarSenha: 'segura123', aceiteTermos: '1',
  });
  assert.equal(res.status, 302);
  res = await p.post('/prestador/servicos', { titulo: 'Troca de registro', categoriaId: '2', preco: '110,00', disponibilidade: 'Seg a sex', descricao: 'Troca de registro de gaveta ou pressão.' });
  assert.equal(res.status, 302);

  const visitante = navegador();
  res = await visitante.get('/servicos?q=registro');
  assert.doesNotMatch(res.text, /Troca de registro/, 'não deve aparecer antes da aprovação');

  const admin = await entrar('admin@exemplo.com');
  res = await admin.get('/admin');
  const id = res.text.match(/\/admin\/prestadores\/(\d+)\/aprovar[\s\S]*?Paulo Prestador|Paulo Prestador[\s\S]*?\/admin\/prestadores\/(\d+)\/aprovar/);
  assert.ok(id, 'prestador listado no painel');
  const prestadorId = id[1] || id[2];
  res = await admin.post(`/admin/prestadores/${prestadorId}/aprovar`);
  assert.equal(res.status, 302);

  res = await visitante.get('/servicos?q=registro');
  assert.match(res.text, /Troca de registro/);
});

test('RF008/RF009: busca por categoria e detalhes do serviço', async () => {
  const n = navegador();
  let res = await n.get('/servicos?categoria=informatica');
  assert.match(res.text, /Formatação de PC/);
  assert.doesNotMatch(res.text, /Instalação de chuveiro/);
  assert.doesNotMatch(res.text, /Desentupimento de pia/, 'prestadora pendente não aparece');
  res = await n.get('/servicos/1');
  assert.equal(res.status, 200);
  assert.match(res.text, /Instalação de chuveiro/);
  assert.match(res.text, /João Silva/);
});

test('RF010–RF015: solicitar, prestador conclui, cliente avalia uma única vez', async () => {
  const cliente = await entrar('ana@exemplo.com');
  let res = await cliente.post('/servicos/5/solicitar', { dataDesejada: '2000-01-01' });
  assert.equal(res.status, 422, 'data no passado é recusada');

  const amanha = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  res = await cliente.post('/servicos/5/solicitar', { dataDesejada: amanha, observacao: 'PC lento' });
  assert.equal(res.status, 302);
  const solId = res.headers.location.split('/').pop();

  // cliente não pode concluir o próprio pedido
  res = await cliente.post(`/pedidos/${solId}/status`, { status: 'concluida' });
  res = await cliente.get(`/pedidos/${solId}`);
  assert.match(res.text, /Pendente/);

  // outro prestador não enxerga o pedido
  const outro = await entrar('joao@exemplo.com');
  res = await outro.get(`/pedidos/${solId}`);
  assert.equal(res.status, 404);

  const prestadora = await entrar('marina@exemplo.com');
  for (const st of ['aceita', 'em_andamento', 'concluida']) {
    res = await prestadora.post(`/pedidos/${solId}/status`, { status: st });
    assert.equal(res.status, 302);
  }
  res = await prestadora.get(`/pedidos/${solId}`);
  assert.match(res.text, /Concluída/);

  res = await cliente.post(`/pedidos/${solId}/avaliar`, { nota: '3', comentario: 'Ok' });
  assert.equal(res.status, 302);
  res = await cliente.post(`/pedidos/${solId}/avaliar`, { nota: '5' });
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM avaliacao WHERE solicitacao_id = $1', [solId]);
  assert.equal(rows[0].n, 1, 'apenas uma avaliação por solicitação');

  // reputação: 5, 5, 4 (seed) + 3 = média 4,3
  res = await navegador().get('/prestadores/6');
  assert.match(res.text, /4,3/);
});

test('RF007: prestador não pode editar serviço de outro prestador', async () => {
  const joao = await entrar('joao@exemplo.com');
  let res = await joao.get('/prestador/servicos/5/editar');
  assert.equal(res.status, 404);
  res = await joao.post('/prestador/servicos/5/excluir');
  const { rows } = await pool.query('SELECT ativo FROM servico WHERE id = 5');
  assert.equal(rows[0].ativo, true);
});

test('controle de acesso: cliente não acessa o painel administrativo', async () => {
  const cliente = await entrar('carlos@exemplo.com');
  const res = await cliente.get('/admin');
  assert.equal(res.status, 403);
});

test('LGPD: exportar dados e excluir conta (anonimização)', async () => {
  const n = await entrar('pedro@exemplo.com');
  let res = await n.get('/perfil/meus-dados');
  assert.equal(res.status, 200);
  assert.equal(JSON.parse(res.text).conta.email, 'pedro@exemplo.com');
  res = await n.post('/perfil/excluir', { senhaConfirmacao: 'Senha123' });
  assert.equal(res.status, 200);
  const { rows } = await pool.query("SELECT nome, telefone, ativo FROM usuario WHERE email LIKE 'removido-%'");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].telefone, null);
  assert.equal(rows[0].ativo, false);
  const login = await navegador().post('/login', { email: 'pedro@exemplo.com', senha: 'Senha123' });
  assert.equal(login.status, 401);
});
