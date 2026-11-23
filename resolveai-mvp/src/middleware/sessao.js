// Middlewares de sessão: usuário logado, controle de acesso, CSRF e mensagens
const crypto = require('crypto');
const UsuarioRepository = require('../persistence/UsuarioRepository');

/** Carrega o usuário da sessão e disponibiliza para as Views. */
async function carregarUsuario(req, res, next) {
  res.locals.usuario = null;
  if (req.session.usuarioId) {
    const usuario = await UsuarioRepository.buscarPorId(req.session.usuarioId);
    if (usuario && usuario.ativo) {
      req.usuario = usuario;
      res.locals.usuario = usuario;
    } else {
      delete req.session.usuarioId;
    }
  }
  next();
}

function exigirLogin(req, res, next) {
  if (!req.usuario) {
    req.session.voltarPara = req.originalUrl;
    req.session.flash = { tipo: 'aviso', texto: 'Entre na sua conta para continuar.' };
    return res.redirect('/login');
  }
  next();
}

/** Restringe a rota a determinados tipos de usuário. */
function exigirTipo(...tipos) {
  return (req, res, next) => {
    if (!req.usuario) return exigirLogin(req, res, next);
    if (!tipos.includes(req.usuario.tipo)) {
      return res.status(403).render('pages/erro', { titulo: 'Acesso negado', mensagem: 'Esta área não está disponível para o seu tipo de conta.' });
    }
    next();
  };
}

/** Proteção contra CSRF: token por sessão conferido em todo POST. */
function csrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrf = req.session.csrf;
  if (req.method === 'POST') {
    const enviado = (req.body && req.body._csrf) || '';
    const esperado = req.session.csrf;
    const ok = enviado.length === esperado.length &&
      crypto.timingSafeEqual(Buffer.from(enviado), Buffer.from(esperado));
    if (!ok) {
      return res.status(403).render('pages/erro', { titulo: 'Sessão expirada', mensagem: 'O formulário expirou. Volte, recarregue a página e tente novamente.' });
    }
  }
  next();
}

/** Mensagem exibida uma única vez após um redirecionamento. */
function flash(req, res, next) {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  req.flash = (tipo, texto) => { req.session.flash = { tipo, texto }; };
  next();
}

module.exports = { carregarUsuario, exigirLogin, exigirTipo, csrf, flash };
