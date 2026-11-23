// Configurações lidas das variáveis de ambiente (arquivo .env em desenvolvimento)
require('dotenv').config({ quiet: true });

const producao = process.env.NODE_ENV === 'production';

if (producao && !process.env.SESSION_SECRET) {
  throw new Error('Defina SESSION_SECRET em produção.');
}

module.exports = {
  producao,
  porta: Number(process.env.PORT) || 3000,
  appNome: process.env.APP_NAME || 'ResolveAí',
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/resolveai',
  databaseSsl: process.env.DATABASE_SSL === 'true',
  sessionSecret: process.env.SESSION_SECRET || 'apenas-para-desenvolvimento-troque-em-producao',
  contatoPrivacidade: process.env.CONTATO_PRIVACIDADE || 'privacidade@exemplo.com.br',
  documentosAtualizadosEm: process.env.DOCUMENTOS_DATA || '09/10/2026',
};
