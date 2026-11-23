// Controller: edição de dados (RF003/RF005), troca de senha e direitos do titular (LGPD)
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Usuario = require('../model/Usuario');
const Prestador = require('../model/Prestador');
const Avaliacao = require('../model/Avaliacao');
const UsuarioRepository = require('../persistence/UsuarioRepository');
const PrestadorRepository = require('../persistence/PrestadorRepository');
const ServicoRepository = require('../persistence/ServicoRepository');
const SolicitacaoRepository = require('../persistence/SolicitacaoRepository');
const AvaliacaoRepository = require('../persistence/AvaliacaoRepository');
const { transacao } = require('../persistence/db');

async function montarDados(usuario) {
  const dados = {
    nome: usuario.nome, email: usuario.email, telefone: usuario.telefone, cidade: usuario.cidade,
  };
  let perfil = null;
  if (usuario.tipo === Usuario.TIPOS.PRESTADOR) {
    perfil = await PrestadorRepository.buscarPerfil(usuario.id);
    dados.descricao = perfil.descricao;
    dados.areaAtendimento = perfil.area_atendimento;
  }
  return { dados, perfil };
}

async function exibir(req, res) {
  const { dados, perfil } = await montarDados(req.usuario);
  res.render('pages/perfil', { titulo: 'Meu perfil', dados, perfil, erros: {}, errosSenha: {} });
}

async function atualizar(req, res) {
  const ehPrestador = req.usuario.tipo === Usuario.TIPOS.PRESTADOR;
  const pessoal = Usuario.validarDadosPessoais(req.body);
  const prof = ehPrestador ? Prestador.validarPerfil(req.body) : { dados: {}, erros: {} };
  const dados = { ...pessoal.dados, ...prof.dados };
  const erros = { ...pessoal.erros, ...prof.erros };
  if (!erros.email && (await UsuarioRepository.emailEmUso(dados.email, req.usuario.id))) {
    erros.email = 'Este e-mail já está em uso por outra conta.';
  }
  if (Object.keys(erros).length) {
    const perfil = ehPrestador ? await PrestadorRepository.buscarPerfil(req.usuario.id) : null;
    return res.status(422).render('pages/perfil', { titulo: 'Meu perfil', dados, perfil, erros, errosSenha: {} });
  }
  await transacao(async (client) => {
    await UsuarioRepository.atualizarDados(req.usuario.id, pessoal.dados, client);
    if (ehPrestador) await PrestadorRepository.atualizarPerfil(req.usuario.id, prof.dados, client);
  });
  req.flash('sucesso', 'Dados atualizados.');
  res.redirect('/perfil');
}

async function trocarSenha(req, res) {
  const errosSenha = Usuario.validarTrocaSenha(req.body);
  if (!errosSenha.senhaAtual) {
    const hash = await UsuarioRepository.buscarHashSenha(req.usuario.id);
    if (!(await bcrypt.compare(String(req.body.senhaAtual), hash))) errosSenha.senhaAtual = 'Senha atual incorreta.';
  }
  if (Object.keys(errosSenha).length) {
    const { dados, perfil } = await montarDados(req.usuario);
    return res.status(422).render('pages/perfil', { titulo: 'Meu perfil', dados, perfil, erros: {}, errosSenha });
  }
  await UsuarioRepository.atualizarSenha(req.usuario.id, await bcrypt.hash(req.body.novaSenha, 10));
  req.flash('sucesso', 'Senha alterada.');
  res.redirect('/perfil');
}

/** LGPD art. 18: acesso e portabilidade — baixa os dados do titular em JSON. */
async function exportarDados(req, res) {
  const u = req.usuario;
  const exportacao = {
    gerado_em: new Date().toISOString(),
    conta: { nome: u.nome, email: u.email, telefone: u.telefone, cidade: u.cidade, tipo: u.tipo,
      criado_em: u.criado_em, aceite_termos_em: u.aceite_termos_em },
  };
  if (u.tipo === Usuario.TIPOS.PRESTADOR) {
    const p = await PrestadorRepository.buscarPerfil(u.id);
    exportacao.perfil_profissional = { descricao: p.descricao, area_atendimento: p.area_atendimento, status_aprovacao: p.status_aprovacao };
    exportacao.servicos = (await ServicoRepository.listarDoPrestador(u.id)).map((s) => ({ titulo: s.titulo, categoria: s.categoria_nome, preco: s.preco, disponibilidade: s.disponibilidade, descricao: s.descricao }));
    exportacao.avaliacoes_recebidas = await AvaliacaoRepository.listarDoPrestador(u.id, 1000);
  }
  if (u.tipo !== Usuario.TIPOS.ADMIN) {
    exportacao.solicitacoes = (await SolicitacaoRepository.listarPorUsuario(u.id, u.tipo)).map((s) => ({
      id: s.id, servico: s.servico_titulo, status: s.status, data_desejada: s.data_desejada, valor: s.valor,
      observacao: s.observacao, criado_em: s.criado_em, nota_avaliacao: s.avaliacao_nota,
    }));
  }
  res.setHeader('Content-Disposition', 'attachment; filename="meus-dados.json"');
  res.json(exportacao);
}

/** LGPD art. 18, VI: eliminação — anonimiza a conta e encerra a sessão. */
async function excluirConta(req, res) {
  const hash = await UsuarioRepository.buscarHashSenha(req.usuario.id);
  if (!(await bcrypt.compare(String(req.body.senhaConfirmacao || ''), hash))) {
    req.flash('erro', 'Senha incorreta. A conta não foi excluída.');
    return res.redirect('/perfil');
  }
  if (req.usuario.tipo === Usuario.TIPOS.ADMIN) {
    req.flash('erro', 'Contas de administrador não podem ser excluídas por aqui.');
    return res.redirect('/perfil');
  }
  const hashAleatorio = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  await transacao(async (client) => {
    await SolicitacaoRepository.cancelarAbertasDoUsuario(req.usuario.id, client);
    if (req.usuario.tipo === Usuario.TIPOS.PRESTADOR) await ServicoRepository.desativarTodosDoPrestador(req.usuario.id, client);
    await UsuarioRepository.anonimizar(req.usuario.id, hashAleatorio, client);
  });
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.render('pages/erro', { usuario: null, titulo: 'Conta excluída', mensagem: 'Seus dados pessoais foram removidos. Obrigado por ter usado a plataforma.' });
  });
}

/** Perfil público do prestador com reputação e avaliações (RF015). */
async function perfilPublicoPrestador(req, res) {
  const id = Number(req.params.id);
  const perfil = Number.isInteger(id) ? await PrestadorRepository.buscarPerfil(id) : null;
  if (!Prestador.podeAtender(perfil)) {
    return res.status(404).render('pages/erro', { titulo: 'Prestador não encontrado', mensagem: 'Este perfil não existe ou não está disponível.' });
  }
  const [servicos, avaliacoes, reputacao] = await Promise.all([
    ServicoRepository.listarVisiveisDoPrestador(id),
    AvaliacaoRepository.listarDoPrestador(id),
    AvaliacaoRepository.reputacao(id),
  ]);
  res.render('pages/prestador-publico', {
    titulo: perfil.nome, perfil, servicos, avaliacoes, reputacao, selo: Avaliacao.selo(reputacao.media, reputacao.total),
  });
}

module.exports = { exibir, atualizar, trocarSenha, exportarDados, excluirConta, perfilPublicoPrestador };
