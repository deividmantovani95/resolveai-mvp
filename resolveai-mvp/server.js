// Ponto de entrada: inicia o servidor HTTP
const app = require('./src/app');
const config = require('./src/config');

app.listen(config.porta, () => {
  console.log(`${config.appNome} rodando em http://localhost:${config.porta}`);
});
