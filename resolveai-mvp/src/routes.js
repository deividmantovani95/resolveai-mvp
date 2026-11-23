// Mapa de rotas: liga cada URL ao Controller responsável
const express = require('express');
const rateLimit = require('express-rate-limit');
const { exigirLogin, exigirTipo } = require('./middleware/sessao');
const Auth = require('./controller/AuthController');
const Perfil = require('./controller/PerfilController');
const Servico = require('./controller/ServicoController');
const Solicitacao = require('./controller/SolicitacaoController');
const Admin = require('./controller/AdminController');
const Pagina = require('./controller/PaginaController');

const r = express.Router();

// Limita tentativas de login e cadastro (RNF de segurança: força bruta)
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => res.status(429).render('pages/erro', { titulo: 'Muitas tentativas', mensagem: 'Aguarde alguns minutos e tente novamente.' }),
});

// Públicas
r.get('/', Servico.inicio);
r.get('/servicos', Servico.buscar);
r.get('/servicos/:id', Servico.detalhes);
r.get('/prestadores/:id', Perfil.perfilPublicoPrestador);
r.get('/termos', Pagina.termos);
r.get('/privacidade', Pagina.privacidade);

// Autenticação — RF001, RF002, RF004
r.get('/login', Auth.formLogin);
r.post('/login', limiteAuth, Auth.login);
r.post('/logout', Auth.logout);
r.get('/cadastro', Auth.formCadastroCliente);
r.post('/cadastro', limiteAuth, Auth.cadastrarCliente);
r.get('/cadastro/prestador', Auth.formCadastroPrestador);
r.post('/cadastro/prestador', limiteAuth, Auth.cadastrarPrestador);

// Perfil e LGPD — RF003, RF005
r.get('/perfil', exigirLogin, Perfil.exibir);
r.post('/perfil', exigirLogin, Perfil.atualizar);
r.post('/perfil/senha', exigirLogin, Perfil.trocarSenha);
r.get('/perfil/meus-dados', exigirLogin, Perfil.exportarDados);
r.post('/perfil/excluir', exigirLogin, Perfil.excluirConta);

// Contratação — RF010, RF011
const cliente = exigirTipo('cliente');
r.get('/servicos/:id/solicitar', cliente, Solicitacao.formSolicitar);
r.post('/servicos/:id/solicitar', cliente, Solicitacao.solicitar);
r.get('/pedidos', exigirTipo('cliente', 'prestador'), Solicitacao.listar);
r.get('/pedidos/:id', exigirTipo('cliente', 'prestador'), Solicitacao.detalhe);
r.post('/pedidos/:id/status', exigirTipo('cliente', 'prestador'), Solicitacao.atualizarStatus);

// Avaliação — RF012, RF013
r.get('/pedidos/:id/avaliar', cliente, Solicitacao.formAvaliar);
r.post('/pedidos/:id/avaliar', cliente, Solicitacao.avaliar);

// Área do prestador — RF006, RF007
const prestador = exigirTipo('prestador');
r.get('/prestador/servicos', prestador, Servico.meusServicos);
r.get('/prestador/servicos/novo', prestador, Servico.formNovo);
r.post('/prestador/servicos', prestador, Servico.criar);
r.get('/prestador/servicos/:id/editar', prestador, Servico.formEditar);
r.post('/prestador/servicos/:id/editar', prestador, Servico.atualizar);
r.post('/prestador/servicos/:id/excluir', prestador, Servico.excluir);

// Administração — RF016
const admin = exigirTipo('admin');
r.get('/admin', admin, Admin.painel);
r.post('/admin/prestadores/:id/aprovar', admin, Admin.aprovar);
r.post('/admin/prestadores/:id/rejeitar', admin, Admin.rejeitar);

module.exports = r;
