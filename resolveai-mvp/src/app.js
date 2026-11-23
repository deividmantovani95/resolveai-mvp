// Montagem da aplicação Express (camada de entrada que encaminha para os Controllers)
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const config = require('./config');
const { pool } = require('./persistence/db');
const { carregarUsuario, csrf, flash } = require('./middleware/sessao');
const viewHelpers = require('./view/helpers');
const rotas = require('./routes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));
if (config.producao) app.set('trust proxy', 1); // necessário atrás do proxy HTTPS do provedor

// Cabeçalhos de segurança (CSP restrita a recursos do próprio site)
app.use(helmet({
  contentSecurityPolicy: { directives: { 'script-src': ["'self'"], 'img-src': ["'self'", 'data:'] } },
}));
app.use(express.static(path.join(__dirname, '../public'), { maxAge: config.producao ? '7d' : 0 }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

app.use(session({
  store: new PgSession({ pool, tableName: 'sessao' }),
  name: 'sid',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: config.producao, maxAge: 1000 * 60 * 60 * 24 * 7 },
}));

app.use((req, res, next) => {
  Object.assign(res.locals, viewHelpers, { appNome: config.appNome, caminho: req.path, aba: null, usuario: null, flash: null, csrf: '' });
  next();
});
app.use(flash);
app.use(csrf);
app.use(carregarUsuario);
app.use(rotas);

app.use((req, res) => {
  res.status(404).render('pages/erro', { titulo: 'Página não encontrada', mensagem: 'O endereço acessado não existe.' });
});

// Erros inesperados: registra no servidor e mostra mensagem amigável
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('pages/erro', { titulo: 'Algo deu errado', mensagem: 'Ocorreu um erro inesperado. Tente novamente em instantes.' });
});

module.exports = app;
