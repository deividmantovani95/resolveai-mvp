// Controller: cadastro de cliente (RF001), cadastro de prestador (RF004), login e logout (RF002)
const bcrypt = require('bcryptjs');
const Usuario = require('../model/Usuario');
const Prestador = require('../model/Prestador');
const UsuarioRepository = require('../persistence/UsuarioRepository');
const PrestadorRepository = require('../persistence/PrestadorRepository');
const { transacao } = require('../persistence/db');

const CUSTO_HASH = 10;

function paginaInicialDoTipo(tipo) {
  if (tipo === Usuario.TIPOS.ADMIN) return '/admin';
  if (tipo === Usuario.TIPOS.PRESTADOR) return '/prestador/servicos';
  return '/';
}

/** Regenera a sessão no login (evita fixação de sessão). */
function iniciarSessao(req, usuarioId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.usuarioId = usuarioId;
      req.session.save((e) => (e ? reject(e) : resolve()));
    });
  });
}

function formLogin(req, res) {
  if (req.usuario) return res.redirect(paginaInicialDoTipo(req.usuario.tipo));
  res.render('pages/login', { titulo: 'Entrar', email: '', erro: null });
}

async function login(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const usuario = email ? await UsuarioRepository.buscarParaLogin(email) : null;
  // Mensagem genérica: não revela se o e-mail existe (RNF de segurança)
  const valido = usuario && usuario.ativo && (await bcrypt.compare(senha, usuario.senha_hash));
  if (!valido) {
    return res.status(401).render('pages/login', { titulo: 'Entrar', email, erro: 'E-mail ou senha incorretos.' });
  }
  const voltarPara = req.session.voltarPara;
  await iniciarSessao(req, usuario.id);
  const destino = voltarPara && voltarPara.startsWith('/') && !voltarPara.startsWith('//') ? voltarPara : paginaInicialDoTipo(usuario.tipo);
  res.redirect(destino);
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.redirect('/login');
  });
}

function formCadastroCliente(req, res) {
  res.render('pages/cadastro-cliente', { titulo: 'Criar conta', dados: {}, erros: {} });
}

async function cadastrarCliente(req, res) {
  const { dados, erros } = Usuario.validarCadastro(req.body);
  if (!erros.email && (await UsuarioRepository.emailEmUso(dados.email))) {
    erros.email = 'Este e-mail já está cadastrado.';
  }
  if (Object.keys(erros).length) {
    return res.status(422).render('pages/cadastro-cliente', { titulo: 'Criar conta', dados, erros });
  }
  const senhaHash = await bcrypt.hash(req.body.senha, CUSTO_HASH);
  const usuario = await UsuarioRepository.inserir({ ...dados, senhaHash, tipo: Usuario.TIPOS.CLIENTE });
  await iniciarSessao(req, usuario.id);
  req.session.flash = { tipo: 'sucesso', texto: `Bem-vindo(a), ${usuario.nome.split(' ')[0]}! Sua conta foi criada.` };
  res.redirect('/');
}

function formCadastroPrestador(req, res) {
  res.render('pages/cadastro-prestador', { titulo: 'Criar perfil de prestador', dados: {}, erros: {} });
}

async function cadastrarPrestador(req, res) {
  const pessoal = Usuario.validarCadastro(req.body);
  const perfil = Prestador.validarPerfil(req.body);
  const dados = { ...pessoal.dados, ...perfil.dados };
  const erros = { ...pessoal.erros, ...perfil.erros };
  if (!erros.email && (await UsuarioRepository.emailEmUso(dados.email))) {
    erros.email = 'Este e-mail já está cadastrado.';
  }
  if (Object.keys(erros).length) {
    return res.status(422).render('pages/cadastro-prestador', { titulo: 'Criar perfil de prestador', dados, erros });
  }
  const senhaHash = await bcrypt.hash(req.body.senha, CUSTO_HASH);
  // Usuário e perfil são gravados juntos: ou os dois, ou nenhum (integridade)
  const usuario = await transacao(async (client) => {
    const u = await UsuarioRepository.inserir({ ...pessoal.dados, senhaHash, tipo: Usuario.TIPOS.PRESTADOR }, client);
    await PrestadorRepository.inserir(u.id, perfil.dados, client);
    return u;
  });
  await iniciarSessao(req, usuario.id);
  req.session.flash = { tipo: 'sucesso', texto: 'Perfil criado! Você já pode cadastrar seus serviços. Eles ficarão visíveis assim que o administrador aprovar seu cadastro.' };
  res.redirect('/prestador/servicos');
}

module.exports = {
  formLogin, login, logout, formCadastroCliente, cadastrarCliente, formCadastroPrestador, cadastrarPrestador,
  paginaInicialDoTipo, CUSTO_HASH,
};
