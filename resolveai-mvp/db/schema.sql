-- =====================================================================
-- Esquema do banco de dados (PostgreSQL 14+)
-- Entidades principais: Cliente, Prestador (ambos especializações de
-- Usuario), Servico, Solicitacao e Avaliacao. Categoria é tabela de apoio.
-- ATENÇÃO: este script APAGA as tabelas existentes (uso em desenvolvimento).
-- =====================================================================

DROP TABLE IF EXISTS avaliacao   CASCADE;
DROP TABLE IF EXISTS solicitacao CASCADE;
DROP TABLE IF EXISTS servico     CASCADE;
DROP TABLE IF EXISTS categoria   CASCADE;
DROP TABLE IF EXISTS prestador   CASCADE;
DROP TABLE IF EXISTS usuario     CASCADE;
DROP TABLE IF EXISTS sessao      CASCADE;

-- Usuário: dados comuns de Cliente, Prestador e Administrador
CREATE TABLE usuario (
  id               SERIAL PRIMARY KEY,
  nome             VARCHAR(120) NOT NULL,
  email            VARCHAR(160) NOT NULL,
  telefone         VARCHAR(20),
  cidade           VARCHAR(80),
  senha_hash       VARCHAR(100) NOT NULL,
  tipo             VARCHAR(10)  NOT NULL CHECK (tipo IN ('cliente', 'prestador', 'admin')),
  ativo            BOOLEAN      NOT NULL DEFAULT TRUE,
  aceite_termos_em TIMESTAMPTZ,              -- registro do consentimento (LGPD)
  criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- e-mail único sem diferenciar maiúsculas/minúsculas
CREATE UNIQUE INDEX usuario_email_uk ON usuario (LOWER(email));

-- Prestador: dados complementares do perfil profissional (1:1 com usuario)
CREATE TABLE prestador (
  usuario_id       INTEGER PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
  descricao        TEXT,
  area_atendimento VARCHAR(160),
  status_aprovacao VARCHAR(10) NOT NULL DEFAULT 'pendente'
                   CHECK (status_aprovacao IN ('pendente', 'aprovado', 'rejeitado')),
  avaliado_em      TIMESTAMPTZ,              -- quando o administrador decidiu
  avaliado_por     INTEGER REFERENCES usuario(id)
);

CREATE TABLE categoria (
  id    SERIAL PRIMARY KEY,
  slug  VARCHAR(30) NOT NULL UNIQUE,
  nome  VARCHAR(60) NOT NULL,
  ordem SMALLINT    NOT NULL DEFAULT 0
);

CREATE TABLE servico (
  id              SERIAL PRIMARY KEY,
  prestador_id    INTEGER NOT NULL REFERENCES prestador(usuario_id),
  categoria_id    INTEGER NOT NULL REFERENCES categoria(id),
  titulo          VARCHAR(100)  NOT NULL,
  descricao       TEXT          NOT NULL,
  preco           NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  disponibilidade VARCHAR(160)  NOT NULL,
  ativo           BOOLEAN       NOT NULL DEFAULT TRUE,   -- exclusão lógica
  criado_em       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX servico_busca_idx     ON servico (categoria_id, ativo);
CREATE INDEX servico_prestador_idx ON servico (prestador_id);

CREATE TABLE solicitacao (
  id            SERIAL PRIMARY KEY,
  cliente_id    INTEGER NOT NULL REFERENCES usuario(id),
  servico_id    INTEGER NOT NULL REFERENCES servico(id),
  prestador_id  INTEGER NOT NULL REFERENCES prestador(usuario_id),
  data_desejada DATE    NOT NULL,
  observacao    VARCHAR(500),
  valor         NUMERIC(10,2) NOT NULL,      -- preço "congelado" no momento do pedido
  status        VARCHAR(12) NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente', 'aceita', 'em_andamento', 'concluida', 'recusada', 'cancelada')),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX solicitacao_cliente_idx   ON solicitacao (cliente_id, criado_em DESC);
CREATE INDEX solicitacao_prestador_idx ON solicitacao (prestador_id, status);

CREATE TABLE avaliacao (
  id             SERIAL PRIMARY KEY,
  solicitacao_id INTEGER  NOT NULL UNIQUE REFERENCES solicitacao(id), -- 1 avaliação por solicitação
  cliente_id     INTEGER  NOT NULL REFERENCES usuario(id),
  prestador_id   INTEGER  NOT NULL REFERENCES prestador(usuario_id),
  nota           SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario     VARCHAR(500),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX avaliacao_prestador_idx ON avaliacao (prestador_id);

-- Tabela de sessões (usada pelo connect-pg-simple)
CREATE TABLE sessao (
  sid    VARCHAR      NOT NULL PRIMARY KEY,
  sess   JSON         NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX sessao_expire_idx ON sessao (expire);

-- Categorias fixas do MVP
INSERT INTO categoria (slug, nome, ordem) VALUES
  ('eletrica',   'Elétrica simples',   1),
  ('hidraulica', 'Hidráulica simples', 2),
  ('reparos',    'Reparos gerais',     3),
  ('informatica','Informática',        4),
  ('montagem',   'Montagem e ajustes', 5);
