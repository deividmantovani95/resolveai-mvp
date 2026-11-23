// Controller: início do cliente, busca (RF008), detalhes (RF009) e gestão de serviços do prestador (RF006/RF007)
const Servico = require('../model/Servico');
const v = require('../model/validacao');
const ServicoRepository = require('../persistence/ServicoRepository');
const CategoriaRepository = require('../persistence/CategoriaRepository');
const PrestadorRepository = require('../persistence/PrestadorRepository');
const AvaliacaoRepository = require('../persistence/AvaliacaoRepository');
const SolicitacaoRepository = require('../persistence/SolicitacaoRepository');

/** Tela inicial: busca, categorias e destaques (wireframe 03). */
async function inicio(req, res) {
  if (req.usuario && req.usuario.tipo === 'prestador') return res.redirect('/prestador/servicos');
  if (req.usuario && req.usuario.tipo === 'admin') return res.redirect('/admin');
  const [categorias, destaques] = await Promise.all([CategoriaRepository.listar(), ServicoRepository.destaques(4)]);
  res.render('pages/inicio', { titulo: 'Início', categorias, destaques });
}

/** Busca por categoria e/ou palavra-chave, com paginação (wireframe 04). */
async function buscar(req, res) {
  const categorias = await CategoriaRepository.listar();
  const categoria = req.query.categoria ? await CategoriaRepository.buscarPorSlug(String(req.query.categoria)) : null;
  const termo = v.texto(req.query.q, 60);
  const pagina = v.inteiroPositivo(req.query.pagina) || 1;
  const resultado = await ServicoRepository.buscar({ categoriaId: categoria && categoria.id, termo, pagina });
  res.render('pages/busca', { titulo: 'Serviços', categorias, categoria, termo, resultado, aba: 'buscar' });
}

/** Detalhes do serviço com dados e reputação do prestador (wireframe 05). */
async function detalhes(req, res) {
  const id = v.inteiroPositivo(req.params.id);
  const servico = id ? await ServicoRepository.buscarVisivelPorId(id) : null;
  if (!servico) {
    return res.status(404).render('pages/erro', { titulo: 'Serviço não encontrado', mensagem: 'Este serviço não existe ou não está mais disponível.' });
  }
  const avaliacoes = await AvaliacaoRepository.listarDoPrestador(servico.prestador_id, 3);
  res.render('pages/servico-detalhes', { titulo: servico.titulo, servico, avaliacoes, aba: 'buscar' });
}

// ---------- Área do prestador ----------

/** Lista "Meus serviços" (wireframe 09). */
async function meusServicos(req, res) {
  const [servicos, perfil, pendentes] = await Promise.all([
    ServicoRepository.listarDoPrestador(req.usuario.id),
    PrestadorRepository.buscarPerfil(req.usuario.id),
    SolicitacaoRepository.contarPendentesDoPrestador(req.usuario.id),
  ]);
  res.render('pages/prestador-servicos', { titulo: 'Meus serviços', servicos, perfil, pendentes });
}

async function formNovo(req, res) {
  const categorias = await CategoriaRepository.listar();
  res.render('pages/servico-form', { titulo: 'Cadastrar serviço', categorias, dados: {}, erros: {}, edicao: false });
}

async function criar(req, res) {
  const categorias = await CategoriaRepository.listar();
  const { dados, erros } = Servico.validar(req.body, categorias);
  if (Object.keys(erros).length) {
    return res.status(422).render('pages/servico-form', { titulo: 'Cadastrar serviço', categorias, dados: { ...req.body, ...dados, preco: req.body.preco }, erros, edicao: false });
  }
  await ServicoRepository.inserir(req.usuario.id, dados);
  req.flash('sucesso', 'Serviço publicado.');
  res.redirect('/prestador/servicos');
}

async function formEditar(req, res) {
  const servico = await ServicoRepository.buscarDoPrestador(v.inteiroPositivo(req.params.id) || 0, req.usuario.id);
  if (!servico) return res.status(404).render('pages/erro', { titulo: 'Serviço não encontrado', mensagem: 'Serviço não encontrado na sua lista.' });
  const categorias = await CategoriaRepository.listar();
  const dados = {
    id: servico.id, titulo: servico.titulo, categoriaId: servico.categoria_id,
    preco: servico.preco.toFixed(2).replace('.', ','), disponibilidade: servico.disponibilidade, descricao: servico.descricao,
  };
  res.render('pages/servico-form', { titulo: 'Editar serviço', categorias, dados, erros: {}, edicao: true });
}

async function atualizar(req, res) {
  const id = v.inteiroPositivo(req.params.id) || 0;
  const categorias = await CategoriaRepository.listar();
  const { dados, erros } = Servico.validar(req.body, categorias);
  if (Object.keys(erros).length) {
    return res.status(422).render('pages/servico-form', { titulo: 'Editar serviço', categorias, dados: { ...dados, id, preco: req.body.preco }, erros, edicao: true });
  }
  const ok = await ServicoRepository.atualizar(id, req.usuario.id, dados);
  req.flash(ok ? 'sucesso' : 'erro', ok ? 'Serviço atualizado.' : 'Serviço não encontrado.');
  res.redirect('/prestador/servicos');
}

async function excluir(req, res) {
  const ok = await ServicoRepository.desativar(v.inteiroPositivo(req.params.id) || 0, req.usuario.id);
  req.flash(ok ? 'sucesso' : 'erro', ok ? 'Serviço removido da sua lista.' : 'Serviço não encontrado.');
  res.redirect('/prestador/servicos');
}

module.exports = { inicio, buscar, detalhes, meusServicos, formNovo, criar, formEditar, atualizar, excluir, formatarPreco: Servico.formatarPreco };
