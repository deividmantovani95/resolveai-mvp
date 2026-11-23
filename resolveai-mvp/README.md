# ResolveAí — MVP do Trabalho de Graduação (ADS · Fatec Mogi Mirim)

Plataforma web responsiva (celular primeiro) que conecta clientes a prestadores de pequenos serviços residenciais e de suporte técnico: elétrica simples, hidráulica simples, reparos gerais, informática e montagem/ajustes.

> "ResolveAí" é um **nome provisório**. Para trocar, altere `APP_NAME` no `.env` e o nome em `public/manifest.webmanifest`.

## Stack escolhida e por quê

| Camada | Tecnologia |
|---|---|
| Servidor | Node.js 20+ com Express 5 |
| Telas | EJS (HTML renderizado no servidor) + CSS próprio |
| Banco | PostgreSQL 14+ (driver `pg`) |
| Segurança | bcryptjs, express-session (sessões no próprio PostgreSQL), Helmet, express-rate-limit |
| Testes | `node:test` (nativo) + Supertest |

**Justificativa.** Uma única linguagem (JavaScript) no projeto inteiro e só 9 dependências de produção. Como as telas são geradas no servidor, não é preciso manter uma API e um front-end separados, nem um processo de build. As quatro camadas do MVCP viram quatro pastas, o que deixa a arquitetura do documento igual à do código. O PostgreSQL tem planos gratuitos em vários provedores, e um site responsivo roda em qualquer celular sem publicação em loja de aplicativos. Um app nativo ou PWA completo fica como trabalho futuro.

## Arquitetura MVCP

```
Usuário → View (EJS) → Controller → Model (regras) → Persistence (SQL) → PostgreSQL
                ↑______________ dados para exibição ______________|
```

```
src/
├── view/          V: telas EJS (pages/ e partials/) e helpers de formatação
├── controller/    C: recebe a requisição, chama Model e Persistence, escolhe a View
├── model/         M: entidades e regras de negócio (validações, estados do pedido, reputação)
├── persistence/   P: repositórios com SQL parametrizado e pool de conexões
├── middleware/    sessão, controle de acesso, CSRF, mensagens
├── routes.js      mapa URL → Controller (comentado com os RFs)
└── app.js         montagem do Express
db/                schema.sql, aplicar-schema.js, seed.js (dados de exemplo)
docs/              requisitos.md, termos-de-uso.md, politica-de-privacidade.md
public/            CSS, ícone, manifest e um JS mínimo (confirmações)
test/              testes do Model e do fluxo completo com banco real
```

Exemplo do diagrama de componentes ("cliente pesquisa elétrica"): `GET /servicos?categoria=eletrica` → `routes.js` → `ServicoController.buscar` → `CategoriaRepository.buscarPorSlug` e `ServicoRepository.buscar` (SQL) → View `pages/busca.ejs`.

A rastreabilidade de cada requisito (RF001–RF016 e RNFs) até o código está em [`docs/requisitos.md`](docs/requisitos.md).

## Rodar localmente

Pré-requisitos: Node.js 20 ou superior e um PostgreSQL (instalado ou via Docker).

```bash
# 1. Dependências
npm install

# 2. Banco: use o seu PostgreSQL ou suba um container
docker compose up -d          # opcional: cria o banco "resolveai" (usuário/senha postgres)

# 3. Configuração
cp .env.example .env          # ajuste DATABASE_URL se necessário

# 4. Tabelas + dados de exemplo
npm run db:reset

# 5. Iniciar
npm run dev                   # http://localhost:3000 (reinicia ao salvar arquivos)
```

Sem Docker, crie o banco antes do passo 4: `createdb resolveai` (ou `CREATE DATABASE resolveai;` no psql/pgAdmin).

### Usuários de exemplo (senha `Senha123`)

| Perfil | E-mail |
|---|---|
| Administrador | admin@exemplo.com |
| Cliente | carlos@exemplo.com, ana@exemplo.com, pedro@exemplo.com |
| Prestador aprovado | joao@exemplo.com (elétrica/hidráulica), marina@exemplo.com (informática), roberto@exemplo.com (montagem) |
| Prestador pendente | luciana@exemplo.com |

Todos os nomes, telefones e avaliações do seed são **fictícios**, criados só para demonstração. Não use esses dados como resultado de pesquisa no TG.

### Testes

```bash
createdb resolveai_teste      # banco separado, apagado a cada execução
npm test                      # 16 testes: regras do Model + fluxos completos
```

Se o seu PostgreSQL usar outra senha, defina `TEST_DATABASE_URL=postgres://usuario:senha@localhost:5432/resolveai_teste`.

## Publicar (gratuito, para a banca)

Sugestão: **Render** para o site e **Neon** para o PostgreSQL. Qualquer provedor Node + PostgreSQL serve (Railway, Fly.io, Supabase etc.); confira os limites atuais dos planos gratuitos antes de escolher.

1. Suba o projeto para um repositório no GitHub (o `.gitignore` já exclui `node_modules` e `.env`).
2. Crie um banco no Neon e copie a *connection string*.
3. Crie as tabelas e os dados de exemplo uma vez, a partir do seu computador:
   ```bash
   DATABASE_URL="<string do Neon>" DATABASE_SSL=true npm run db:reset
   ```
4. No Render, crie um **Web Service** ligado ao repositório:
   - Build command: `npm install`
   - Start command: `npm start`
   - Variáveis de ambiente: `NODE_ENV=production`, `DATABASE_URL=<string do Neon>`, `DATABASE_SSL=true`, `SESSION_SECRET=<frase longa aleatória>`, `APP_NAME`, `CONTATO_PRIVACIDADE`.
5. Abra a URL gerada. Em produção, o cookie de sessão só trafega por HTTPS (o Render já fornece).

Antes da defesa, troque as senhas de exemplo ou rode o seed só no ambiente de demonstração.

## Fora do MVP (trabalhos futuros)

- Pagamento pela plataforma (ex.: Pix com intermediação)
- Chat entre cliente e prestador (hoje o contato é liberado por telefone/WhatsApp após o aceite)
- Fotos dos serviços e portfólio do prestador
- Notificações por e-mail/push e recuperação de senha por e-mail
- Busca por geolocalização e raio de atendimento
- Verificação de documentos do prestador e moderação de avaliações
- PWA instalável completo (offline) ou app nativo
