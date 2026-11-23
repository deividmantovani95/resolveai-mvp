// Controller: painel administrativo — aprovação de prestadores (RF016)
const Prestador = require('../model/Prestador');
const v = require('../model/validacao');
const PrestadorRepository = require('../persistence/PrestadorRepository');

async function painel(req, res) {
  const [prestadores, contagem] = await Promise.all([
    PrestadorRepository.listarParaModeracao(),
    PrestadorRepository.contarPorStatus(),
  ]);
  res.render('pages/admin', { titulo: 'Painel administrativo', prestadores, contagem, aba: 'inicio' });
}

function decidir(status) {
  return async (req, res) => {
    const id = v.inteiroPositivo(req.params.id) || 0;
    const ok = await PrestadorRepository.definirStatusAprovacao(id, status, req.usuario.id);
    req.flash(ok ? 'sucesso' : 'erro', ok ? `Prestador ${status === Prestador.STATUS_APROVACAO.APROVADO ? 'aprovado' : 'rejeitado'}.` : 'Prestador não encontrado.');
    res.redirect('/admin');
  };
}

module.exports = {
  painel,
  aprovar: decidir(Prestador.STATUS_APROVACAO.APROVADO),
  rejeitar: decidir(Prestador.STATUS_APROVACAO.REJEITADO),
};
