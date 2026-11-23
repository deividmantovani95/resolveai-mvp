// Popula o banco com dados de EXEMPLO (fictícios) para demonstração e testes.
// Senha de todos os usuários de exemplo: Senha123
const bcrypt = require('bcryptjs');
const { pool } = require('../src/persistence/db');

const SENHA = 'Senha123';

const usuarios = [
  { nome: 'Administrador', email: 'admin@exemplo.com', telefone: '19900000000', cidade: 'Mogi Mirim', tipo: 'admin' },
  { nome: 'Carlos Pereira', email: 'carlos@exemplo.com', telefone: '19911111111', cidade: 'Mogi Mirim', tipo: 'cliente' },
  { nome: 'Ana Souza', email: 'ana@exemplo.com', telefone: '19922222222', cidade: 'Mogi Guaçu', tipo: 'cliente' },
  { nome: 'Pedro Lima', email: 'pedro@exemplo.com', telefone: '19933333333', cidade: 'Mogi Mirim', tipo: 'cliente' },
  { nome: 'João Silva', email: 'joao@exemplo.com', telefone: '19944444444', cidade: 'Mogi Mirim', tipo: 'prestador',
    perfil: { descricao: 'Eletricista e encanador com 12 anos de experiência em reparos residenciais. Atendo com hora marcada e deixo o local limpo.', area: 'Mogi Mirim e Mogi Guaçu', status: 'aprovado' } },
  { nome: 'Marina Costa', email: 'marina@exemplo.com', telefone: '19955555555', cidade: 'Mogi Guaçu', tipo: 'prestador',
    perfil: { descricao: 'Técnica em informática. Formatação, instalação de programas, montagem e upgrade de computadores e configuração de redes Wi-Fi.', area: 'Mogi Guaçu, Mogi Mirim e Itapira', status: 'aprovado' } },
  { nome: 'Roberto Alves', email: 'roberto@exemplo.com', telefone: '19966666666', cidade: 'Mogi Mirim', tipo: 'prestador',
    perfil: { descricao: 'Montador de móveis e faz-tudo. Montagem e desmontagem de móveis, instalação de prateleiras, cortinas e suportes de TV.', area: 'Mogi Mirim (todos os bairros)', status: 'aprovado' } },
  { nome: 'Luciana Ramos', email: 'luciana@exemplo.com', telefone: '19977777777', cidade: 'Itapira', tipo: 'prestador',
    perfil: { descricao: 'Pequenos reparos hidráulicos e elétricos. Recém-chegada à plataforma, aguardando aprovação do cadastro.', area: 'Itapira e Mogi Mirim', status: 'pendente' } },
];

// [emailPrestador, slugCategoria, titulo, preco, disponibilidade, descricao]
const servicos = [
  ['joao@exemplo.com', 'eletrica', 'Instalação de chuveiro', 90, 'Seg a sáb, 8h às 18h', 'Instalação e troca de chuveiros elétricos, com verificação da fiação e do disjuntor. Atendimento residencial.'],
  ['joao@exemplo.com', 'eletrica', 'Troca de tomada ou interruptor', 70, 'Seg a sáb, 8h às 18h', 'Substituição de tomadas e interruptores, incluindo adequação ao padrão novo de três pinos.'],
  ['joao@exemplo.com', 'hidraulica', 'Reparo em vazamento', 80, 'Seg a sex, 8h às 17h', 'Conserto de vazamentos em torneiras, sifões, registros e ligações flexíveis.'],
  ['joao@exemplo.com', 'hidraulica', 'Troca de torneira ou sifão', 75, 'Seg a sex, 8h às 17h', 'Retirada da peça antiga e instalação da nova (a peça é fornecida pelo cliente).'],
  ['marina@exemplo.com', 'informatica', 'Formatação de PC', 100, 'Seg a sex, 9h às 19h', 'Backup dos arquivos, formatação, instalação do sistema operacional, drivers e programas básicos.'],
  ['marina@exemplo.com', 'informatica', 'Instalação de hardware', 80, 'Seg a sex, 9h às 19h', 'Instalação de memória RAM, SSD, placa de vídeo e outros componentes, com testes de funcionamento.'],
  ['marina@exemplo.com', 'informatica', 'Configuração de rede Wi-Fi', 90, 'Sáb, 9h às 14h', 'Configuração de roteador, senha segura, rede de convidados e posicionamento para melhor sinal.'],
  ['roberto@exemplo.com', 'montagem', 'Montagem de móvel', 120, 'Seg a sáb, 8h às 18h', 'Montagem de guarda-roupas, camas, racks e escrivaninhas. Preço base para móveis de até 2 portas.'],
  ['roberto@exemplo.com', 'montagem', 'Instalação de suporte de TV', 100, 'Seg a sáb, 8h às 18h', 'Fixação de suporte de parede para TVs de até 65 polegadas, com nivelamento e organização dos cabos.'],
  ['roberto@exemplo.com', 'reparos', 'Instalação de prateleiras e cortinas', 85, 'Seg a sáb, 8h às 18h', 'Furação e fixação de prateleiras, varões e trilhos de cortina em alvenaria ou drywall.'],
  ['luciana@exemplo.com', 'hidraulica', 'Desentupimento de pia', 90, 'Seg a sex, 8h às 17h', 'Desentupimento de pias e ralos sem quebra.'],
];

// [emailCliente, tituloServico, diasAtras, status, nota?, comentario?]
const historico = [
  ['carlos@exemplo.com', 'Formatação de PC', 20, 'concluida', 5, 'Muito atenciosa, explicou tudo e fez backup dos meus arquivos.'],
  ['ana@exemplo.com', 'Formatação de PC', 15, 'concluida', 5, 'Rápida e organizada.'],
  ['pedro@exemplo.com', 'Instalação de hardware', 12, 'concluida', 4, 'Bom serviço, só atrasou um pouco.'],
  ['carlos@exemplo.com', 'Instalação de chuveiro', 10, 'concluida', 5, 'Chegou no horário e resolveu rápido.'],
  ['ana@exemplo.com', 'Reparo em vazamento', 8, 'concluida', 4, 'Resolveu o vazamento da cozinha.'],
  ['pedro@exemplo.com', 'Montagem de móvel', 6, 'concluida', 5, 'Montou o guarda-roupa com cuidado.'],
  ['carlos@exemplo.com', 'Instalação de suporte de TV', 5, 'concluida', null, null],
  ['ana@exemplo.com', 'Troca de tomada ou interruptor', 2, 'em_andamento', null, null],
  ['pedro@exemplo.com', 'Instalação de chuveiro', 1, 'pendente', null, null],
  ['carlos@exemplo.com', 'Configuração de rede Wi-Fi', 1, 'pendente', null, null],
];

function dataISO(diasAPartirDeHoje) {
  const d = new Date();
  d.setDate(d.getDate() + diasAPartirDeHoje);
  return d.toISOString().slice(0, 10);
}

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE avaliacao, solicitacao, servico, prestador, usuario RESTART IDENTITY CASCADE');
    const hash = await bcrypt.hash(SENHA, 10);
    const ids = {};
    let admin = null;

    for (const u of usuarios) {
      const { rows } = await client.query(
        `INSERT INTO usuario (nome, email, telefone, cidade, senha_hash, tipo, aceite_termos_em)
         VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
        [u.nome, u.email, u.telefone, u.cidade, hash, u.tipo]
      );
      ids[u.email] = rows[0].id;
      if (u.tipo === 'admin') admin = rows[0].id;
      if (u.perfil) {
        await client.query(
          `INSERT INTO prestador (usuario_id, descricao, area_atendimento, status_aprovacao, avaliado_em, avaliado_por)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [rows[0].id, u.perfil.descricao, u.perfil.area, u.perfil.status,
            u.perfil.status === 'pendente' ? null : new Date(), u.perfil.status === 'pendente' ? null : admin]
        );
      }
    }

    const { rows: cats } = await client.query('SELECT id, slug FROM categoria');
    const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
    const servicoIds = {};
    for (const [email, slug, titulo, preco, disp, desc] of servicos) {
      const { rows } = await client.query(
        `INSERT INTO servico (prestador_id, categoria_id, titulo, descricao, preco, disponibilidade)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [ids[email], catId[slug], titulo, desc, preco, disp]
      );
      servicoIds[titulo] = { id: rows[0].id, prestador: ids[email], preco };
    }

    for (const [email, titulo, dias, status, nota, comentario] of historico) {
      const s = servicoIds[titulo];
      const { rows } = await client.query(
        `INSERT INTO solicitacao (cliente_id, servico_id, prestador_id, data_desejada, observacao, valor, status, criado_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7, NOW() - ($8 || ' days')::interval) RETURNING id`,
        [ids[email], s.id, s.prestador, dataISO(status === 'concluida' ? -dias + 2 : 3),
          'Pedido de exemplo gerado pelo seed.', s.preco, status, dias]
      );
      if (nota) {
        await client.query(
          `INSERT INTO avaliacao (solicitacao_id, cliente_id, prestador_id, nota, comentario, criado_em)
           VALUES ($1,$2,$3,$4,$5, NOW() - ($6 || ' days')::interval)`,
          [rows[0].id, ids[email], s.prestador, nota, comentario, Math.max(dias - 3, 0)]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`Dados de exemplo inseridos. Senha de todos os usuários: ${SENHA}`);
    console.log('Logins: admin@exemplo.com | carlos@exemplo.com (cliente) | joao@exemplo.com (prestador) | luciana@exemplo.com (prestador pendente)');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((err) => {
  console.error('Erro no seed:', err.message);
  process.exit(1);
});
