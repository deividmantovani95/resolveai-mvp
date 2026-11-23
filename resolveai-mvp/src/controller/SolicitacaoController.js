// Controller: solicitar contratação (RF010), acompanhar/gerenciar solicitações (RF011) e avaliar (RF012/RF013)
const Solicitacao = require('../model/Solicitacao');
const Avaliacao = require('../model/Avaliacao');
const v = require('../model/validacao');
const ServicoRepository = require('../persistence/ServicoRepository');
const SolicitacaoRepository = require('../persistence/SolicitacaoRepository');
const AvaliacaoRepository = require('../persistence/AvaliacaoRepository');

function naoEncontrada(res) {
  return res.status(404).render('pages/erro', { titulo: 'Solicitação não encontrada', mensagem: 'Esta solicitação não existe ou não pertence a você.' });
}

/** Tela de confirmação (wireframe 06). */
async function formSolicitar(req, res) {
  const servico = await ServicoRepository.buscarVisivelPorId(v.inteiroPositivo(req.params.id) || 0);
  if (!servico) return res.status(404).render('pages/erro', { titulo: 'Serviço indisponível', mensagem: 'Este serviço não está mais disponível.' });
  res.render('pages/solicitar', { titulo: 'Contratar', servico, dados: {}, erros: {}, hoje: v.hojeISO(), aba: 'pedidos' });
}

async function solicitar(req, res) {
  const servico = await ServicoRepository.buscarVisivelPorId(v.inteiroPositivo(req.params.id) || 0);
  if (!servico) return res.status(404).render('pages/erro', { titulo: 'Serviço indisponível', mensagem: 'Este serviço não está mais disponível.' });
  const { dados, erros } = Solicitacao.validarPedido(req.body);
  if (Object.keys(erros).length) {
    return res.status(422).render('pages/solicitar', { titulo: 'Contratar', servico, dados, erros, hoje: v.hojeISO(), aba: 'pedidos' });
  }
  const id = await SolicitacaoRepository.inserir({
    clienteId: req.usuario.id, servicoId: servico.id, prestadorId: servico.prestador_id,
    dataDesejada: dados.dataDesejada, observacao: dados.observacao || null, valor: servico.preco,
  });
  req.flash('sucesso', 'Solicitação enviada! O prestador vai responder em breve.');
  res.redirect(`/pedidos/${id}`);
}

/** Lista de pedidos com abas Todas/Pendentes/Concluídas (wireframe 10). */
async function listar(req, res) {
  const filtro = ['todas', 'pendentes', 'concluidas'].includes(req.query.filtro) ? req.query.filtro : 'todas';
  const solicitacoes = await SolicitacaoRepository.listarPorUsuario(req.usuario.id, req.usuario.tipo, filtro);
  res.render('pages/pedidos', { titulo: req.usuario.tipo === 'prestador' ? 'Solicitações' : 'Meus pedidos', solicitacoes, filtro, aba: 'pedidos' });
}

/** Detalhe do pedido com ações conforme o papel (wireframe 11). */
async function detalhe(req, res) {
  const sol = await SolicitacaoRepository.buscarPorId(v.inteiroPositivo(req.params.id) || 0);
  const papel = Solicitacao.papelNaSolicitacao(sol, req.usuario);
  if (!papel) return naoEncontrada(res);
  res.render('pages/pedido-detalhe', {
    titulo: `Solicitação #${sol.id}`, sol, papel,
    proximos: Solicitacao.proximosStatus(sol.status, papel),
    podeAvaliar: !Avaliacao.motivoBloqueio(sol, req.usuario.id),
    aba: 'pedidos',
  });
}

/** Atualização de status validada pela máquina de estados do Model. */
async function atualizarStatus(req, res) {
  const sol = await SolicitacaoRepository.buscarPorId(v.inteiroPositivo(req.params.id) || 0);
  const papel = Solicitacao.papelNaSolicitacao(sol, req.usuario);
  if (!papel) return naoEncontrada(res);
  const novo = String(req.body.status || '');
  if (!Solicitacao.podeTransitar(sol.status, novo, papel)) {
    req.flash('erro', 'Esta mudança de status não é permitida.');
    return res.redirect(`/pedidos/${sol.id}`);
  }
  const ok = await SolicitacaoRepository.atualizarStatus(sol.id, sol.status, novo);
  req.flash(ok ? 'sucesso' : 'erro', ok ? `Status atualizado para "${Solicitacao.ROTULO[novo]}".` : 'O pedido foi alterado por outra pessoa. Confira o status atual.');
  res.redirect(`/pedidos/${sol.id}`);
}

/** Tela de avaliação (wireframe 12). */
async function formAvaliar(req, res) {
  const sol = await SolicitacaoRepository.buscarPorId(v.inteiroPositivo(req.params.id) || 0);
  const bloqueio = Avaliacao.motivoBloqueio(sol, req.usuario.id);
  if (bloqueio) {
    req.flash('erro', bloqueio);
    return res.redirect(sol && Solicitacao.papelNaSolicitacao(sol, req.usuario) ? `/pedidos/${sol.id}` : '/pedidos');
  }
  res.render('pages/avaliar', { titulo: 'Avaliar', sol, dados: {}, erros: {}, aba: 'pedidos' });
}

async function avaliar(req, res) {
  const sol = await SolicitacaoRepository.buscarPorId(v.inteiroPositivo(req.params.id) || 0);
  const bloqueio = Avaliacao.motivoBloqueio(sol, req.usuario.id);
  if (bloqueio) {
    req.flash('erro', bloqueio);
    return res.redirect(sol && Solicitacao.papelNaSolicitacao(sol, req.usuario) ? `/pedidos/${sol.id}` : '/pedidos');
  }
  const { dados, erros } = Avaliacao.validar(req.body);
  if (Object.keys(erros).length) {
    return res.status(422).render('pages/avaliar', { titulo: 'Avaliar', sol, dados, erros, aba: 'pedidos' });
  }
  try {
    await AvaliacaoRepository.inserir({ solicitacaoId: sol.id, clienteId: req.usuario.id, prestadorId: sol.prestador_id, nota: dados.nota, comentario: dados.comentario || null });
  } catch (err) {
    if (err.code === '23505') { // violação de UNIQUE: já avaliada (duplo clique, por exemplo)
      req.flash('erro', 'Esta solicitação já foi avaliada.');
      return res.redirect(`/pedidos/${sol.id}`);
    }
    throw err;
  }
  req.flash('sucesso', 'Obrigado pela avaliação!');
  res.redirect(`/pedidos/${sol.id}`);
}

module.exports = { formSolicitar, solicitar, listar, detalhe, atualizarStatus, formAvaliar, avaliar };
