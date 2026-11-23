// Controller: páginas institucionais (Termos de Uso e Política de Privacidade)
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Converte o markdown simples dos documentos em HTML (títulos, listas, parágrafos e negrito)
function markdownSimples(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const html = [];
  let lista = false;
  for (const linha of md.split('\n')) {
    const l = linha.trimEnd();
    if (/^[-*] /.test(l)) {
      if (!lista) { html.push('<ul>'); lista = true; }
      html.push(`<li>${inline(l.slice(2))}</li>`);
      continue;
    }
    if (lista) { html.push('</ul>'); lista = false; }
    if (!l) continue;
    const h = l.match(/^(#{1,3}) (.+)/);
    if (h) html.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`);
    else if (l.startsWith('> ')) html.push(`<p class="nota">${inline(l.slice(2))}</p>`);
    else html.push(`<p>${inline(l)}</p>`);
  }
  if (lista) html.push('</ul>');
  return html.join('\n');
}

function documento(arquivo, titulo) {
  return (req, res) => {
    const md = fs.readFileSync(path.join(__dirname, '../../docs', arquivo), 'utf8')
      .replaceAll('[NOME DO APP]', config.appNome)
      .replaceAll('[E-MAIL DE CONTATO]', config.contatoPrivacidade)
      .replaceAll('[DATA]', config.documentosAtualizadosEm);
    res.render('pages/documento', { titulo, conteudo: markdownSimples(md) });
  };
}

module.exports = {
  termos: documento('termos-de-uso.md', 'Termos de Uso'),
  privacidade: documento('politica-de-privacidade.md', 'Política de Privacidade'),
  markdownSimples,
};
