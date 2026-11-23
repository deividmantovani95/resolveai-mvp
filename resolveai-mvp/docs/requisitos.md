# Requisitos do MVP

Numeração original mantida (RF001–RF015). RF016 foi acrescentado para o painel administrativo pedido na Etapa 1. A coluna "Onde" indica o Controller principal.

## Requisitos funcionais

| Código | Requisito | Detalhamento / critério de aceite | Onde |
|---|---|---|---|
| RF001 | Cadastrar cliente | O visitante informa nome, e-mail, telefone (WhatsApp), cidade e senha, e aceita os Termos e a Política de Privacidade. E-mail único (sem diferenciar maiúsculas). Senha com 8 a 72 caracteres, letras e números. Após o cadastro, a sessão é iniciada. | AuthController.cadastrarCliente |
| RF002 | Autenticar usuário | Login por e-mail e senha para cliente, prestador e administrador; mensagem genérica em caso de erro; logout encerra a sessão. Cada tipo é levado à sua tela inicial. | AuthController.login / logout |
| RF003 | Editar dados do cliente | O usuário altera nome, e-mail, telefone e cidade, e troca a senha informando a atual. | PerfilController.atualizar / trocarSenha |
| RF004 | Cadastrar prestador | Mesmos dados do RF001 mais região de atendimento e descrição profissional (mín. 20 caracteres). O cadastro nasce com status "pendente". | AuthController.cadastrarPrestador |
| RF005 | Editar perfil do prestador | O prestador altera dados pessoais, região e descrição; o perfil público mostra descrição, região, serviços e reputação. | PerfilController.atualizar / perfilPublicoPrestador |
| RF006 | Cadastrar serviço | Título, categoria, preço base (R$), disponibilidade e descrição. Pode ser feito com cadastro pendente, mas só fica visível após a aprovação (RF016). | ServicoController.criar |
| RF007 | Gerenciar serviços | Listar "Meus serviços", editar e excluir. A exclusão é lógica, para preservar o histórico. Um prestador não altera serviços de outro. | ServicoController.meusServicos / atualizar / excluir |
| RF008 | Buscar serviços por categoria | Busca por categoria e/ou palavra-chave (título, descrição, categoria), paginada (12 por página), ordenada pela reputação. Só aparecem serviços ativos de prestadores aprovados. | ServicoController.buscar |
| RF009 | Ver detalhes do serviço | Título, preço base, descrição, disponibilidade, região, prestador com média e quantidade de avaliações, e avaliações recentes. | ServicoController.detalhes |
| RF010 | Solicitar contratação | O cliente informa a data desejada (de hoje até 6 meses) e uma observação opcional. O preço é registrado no momento do pedido. Status inicial: pendente. | SolicitacaoController.solicitar |
| RF011 | Acompanhar e atualizar solicitações | Listas com abas Todas / Em aberto / Encerradas. Prestador: aceitar ou recusar, iniciar e concluir. Cliente: cancelar enquanto pendente ou aceita. O telefone de contato é liberado após o aceite. | SolicitacaoController.listar / detalhe / atualizarStatus |
| RF012 | Avaliar serviço | Nota de 1 a 5 estrelas e comentário opcional (até 500 caracteres). | SolicitacaoController.avaliar |
| RF013 | Garantir avaliação válida | Só o cliente da solicitação avalia, só com status "concluída" e só uma vez (regra no Model e restrição UNIQUE no banco). | Model Avaliacao.motivoBloqueio |
| RF014 | Calcular reputação | Média das notas (1 casa decimal) e total de avaliações por prestador, com distribuição por nota e selo ("Novo na plataforma" / "Muito bem avaliado"). | AvaliacaoRepository.reputacao |
| RF015 | Exibir reputação | Média e quantidade aparecem nos cards da busca, nos detalhes do serviço e no perfil público; a busca ordena pela reputação. | Views card-servico, servico-detalhes, prestador-publico |
| RF016 | Aprovar prestadores (admin) | O administrador vê os prestadores (pendentes primeiro) e aprova ou rejeita. Rejeitados somem da busca. | AdminController |

## Requisitos não funcionais

| Código | Categoria | Requisito | Como foi atendido |
|---|---|---|---|
| RNF001 | Segurança | Senhas nunca armazenadas em texto puro | Hash bcrypt (custo 10) |
| RNF002 | Segurança | Proteção contra ataques comuns da web | Consultas parametrizadas (SQL injection), escape automático do EJS (XSS), token CSRF, cabeçalhos Helmet/CSP, cookie HttpOnly + SameSite, sessão regenerada no login, limite de 20 tentativas de login a cada 15 min |
| RNF003 | Segurança | Controle de acesso por perfil | Middleware exigirTipo; verificação de dono em pedidos e serviços |
| RNF004 | Usabilidade | Interface responsiva, priorizando o celular | CSS mobile first, navegação inferior com 4 itens (como nos wireframes), alvos de toque de 48px, funciona sem JavaScript |
| RNF005 | Clareza | Mensagens e rótulos simples | Erros ao lado de cada campo, status com cores e rótulos, linha do tempo do pedido |
| RNF006 | Desempenho | Respostas rápidas na busca | Paginação, índices nas colunas filtradas, cache das categorias |
| RNF007 | Integridade | Dados consistentes | Chaves estrangeiras, CHECK e UNIQUE no banco; transações; atualização de status condicionada ao status atual; exclusão lógica |
| RNF008 | Privacidade (LGPD) | Direitos do titular | Aceite registrado, exportação dos dados em JSON, exclusão por anonimização, telefone só após o aceite |
| RNF009 | Manutenibilidade | Código organizado em MVCP | Pastas view, controller, model e persistence; testes automatizados |
