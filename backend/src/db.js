import pg from 'pg';
import { config } from './config.js';
import { normalizar } from './texto.js';

const { Pool } = pg;

// --- Ligação -------------------------------------------------------------
// Em produção o alojamento fornece DATABASE_URL. Os serviços geridos
// (Neon, Render, Railway…) exigem TLS, mas usam certificados que o Node
// não reconhece por omissão — daí o rejectUnauthorized: false.
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] erro inesperado no pool:', err.message);
});

// Atalhos: query devolve linhas; one devolve a primeira (ou undefined)
export async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

export async function one(text, params = []) {
  const rows = await query(text, params);
  return rows[0];
}

// Executa várias instruções numa transação. Recebe uma função que usa
// o cliente dedicado — se lançar erro, faz ROLLBACK de tudo.
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// --- Esquema -------------------------------------------------------------
// Criado no arranque. É idempotente: correr várias vezes não faz mal.
export async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      phone         TEXT NOT NULL UNIQUE,
      email         TEXT,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('passenger','driver')),
      vehicle_type  TEXT CHECK (vehicle_type IN ('car','motorbike')),
      vehicle_model TEXT,
      vehicle_plate TEXT,
      vehicle_color TEXT,
      -- Só motoristas: pending -> approved | rejected.
      -- Um motorista só recebe pedidos depois de aprovado.
      driver_status TEXT CHECK (driver_status IN ('pending','approved','rejected','suspended')),
      is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
      -- Só motoristas: se está a aceitar pedidos neste momento
      is_online     BOOLEAN NOT NULL DEFAULT FALSE,
      -- Última posição conhecida, para o passageiro ver o motorista
      -- a aproximar-se e para escolher o motorista mais próximo
      last_lat      DOUBLE PRECISION,
      last_lng      DOUBLE PRECISION,
      last_seen_at  TIMESTAMPTZ,
      rating_avg    REAL NOT NULL DEFAULT 0,
      rating_count  INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS rides (
      id           SERIAL PRIMARY KEY,
      passenger_id INTEGER NOT NULL REFERENCES users(id),
      driver_id    INTEGER REFERENCES users(id),
      origin_label TEXT,
      origin_lat   DOUBLE PRECISION,
      origin_lng   DOUBLE PRECISION,
      dest_label   TEXT NOT NULL,
      dest_lat     DOUBLE PRECISION,
      dest_lng     DOUBLE PRECISION,
      fare_usd     REAL,
      vehicle_type TEXT CHECK (vehicle_type IN ('car','motorbike')),
      status       TEXT NOT NULL DEFAULT 'requested'
                   CHECK (status IN ('requested','accepted','arriving','in_progress','completed','cancelled')),
      cancelled_by INTEGER REFERENCES users(id),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Documentos dos motoristas (carta de condução, documento do veículo).
  // Guardados na própria base de dados: para um piloto com poucos
  // motoristas chega, e evita depender de mais um serviço externo.
  // Se crescer, esta tabela é o único sítio a mudar.
  await query(`
    CREATE TABLE IF NOT EXISTS driver_documents (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      kind       TEXT NOT NULL CHECK (kind IN ('licence','vehicle','photo')),
      mime       TEXT NOT NULL,
      bytes      BYTEA NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, kind)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      ride_id    INTEGER NOT NULL REFERENCES rides(id),
      sender_id  INTEGER NOT NULL REFERENCES users(id),
      body       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Alertas de emergência. Guardados com a posição do momento: se algo
  // correr mal durante uma viagem, o que interessa é saber ONDE estava a
  // pessoa quando pediu ajuda, não onde estava quando entrou no carro.
  await query(`
    CREATE TABLE IF NOT EXISTS sos_alerts (
      id         SERIAL PRIMARY KEY,
      ride_id    INTEGER REFERENCES rides(id),
      user_id    INTEGER NOT NULL REFERENCES users(id),
      lat        DOUBLE PRECISION,
      lng        DOUBLE PRECISION,
      note       TEXT,
      resolved   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ratings (
      id         SERIAL PRIMARY KEY,
      ride_id    INTEGER NOT NULL REFERENCES rides(id),
      rater_id   INTEGER NOT NULL REFERENCES users(id),
      ratee_id   INTEGER NOT NULL REFERENCES users(id),
      stars      INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (ride_id, rater_id)
    )
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status)');
  await query('CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_rides_passenger ON rides(passenger_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_messages_ride ON messages(ride_id)');

  // Assinatura dos motoristas. Um dia conta quando houve uma viagem
  // concluída — e a chave única (user_id, dia) é o que faz cumprir a regra
  // "uma vez por dia" sem contar viagens em lado nenhum.
  await query(`
    CREATE TABLE IF NOT EXISTS dias_contados (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dia        DATE NOT NULL,
      ride_id    INTEGER,
      gratuito   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, dia)
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_dias_user ON dias_contados(user_id, dia DESC)');

  // Cada entrada de dinheiro fica registada com o método e a referência.
  // Numa cobrança em dinheiro vivo, o registo é a única prova que existe —
  // e tem de servir tanto ao motorista como à contabilidade.
  await query(`
    CREATE TABLE IF NOT EXISTS carregamentos (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dias       INTEGER NOT NULL,
      valor_usd  NUMERIC(8,2),
      metodo     TEXT,
      referencia TEXT,
      admin_id   INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // --- Migrações para bases criadas antes destas colunas ---
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_status TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`);
  // Motoristas que já existiam ficam aprovados: foram criados antes da
  // regra existir e bloqueá-los agora quebraria contas em uso.
  await query(
    `UPDATE users SET driver_status = 'approved'
     WHERE role = 'driver' AND driver_status IS NULL`
  );

  // O contrário, e este apanhou uma conta real.
  //
  // Quem se registou como passageiro e mais tarde declarou um veículo ficava
  // com `driver_status` preenchido e `role` em 'passenger' — porque a rota
  // que declara o veículo nunca escrevia o papel. A conta podia ser aprovada
  // no painel e continuava invisível ao despacho, que filtra tudo por
  // `role = 'driver'`.
  //
  // Aprovada e sem receber um único pedido, sem nada que o explicasse.
  const papelPorCorrigir = await query(
    `UPDATE users SET role = 'driver'
      WHERE driver_status IS NOT NULL AND role <> 'driver'
      RETURNING id`
  );
  if (papelPorCorrigir.length) {
    console.log(
      `[db] ${papelPorCorrigir.length} conta(s) aprovadas como motorista tinham o papel errado — corrigido`
    );
  }

  await query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT FALSE`
  );
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS dias_saldo INTEGER NOT NULL DEFAULT 0`);

  // Município, guardado em vez de calculado a cada consulta. Assim o
  // filtro dos pedidos é uma igualdade simples, e não catorze cálculos de
  // distância dentro do SQL a cada vez que um motorista abre a lista.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS municipio TEXT`);
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS municipio TEXT`);
  await query('CREATE INDEX IF NOT EXISTS idx_rides_municipio ON rides(municipio, status)');

  // Sítios que os passageiros nomearam e o mapa não conhece.
  //
  // É a mesma ideia que a Grab usou para construir o GrabMaps: quem anda na
  // rua sabe coisas que o mapa não sabe. Quando alguém toca no mapa e escreve
  // "Bidau Toko Baru" por cima do nome da rua que lhe mostrámos, está a
  // corrigir o mapa — e essa correcção não se deve deitar fora.
  //
  // Depois de revistos, entram no OpenStreetMap e passam a existir para toda
  // a gente: para nós, para a Grab, para o Google que também o importa.
  await query(`
    CREATE TABLE IF NOT EXISTS lugares_propostos (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      nome       TEXT NOT NULL,
      nome_mapa  TEXT,
      lat        DOUBLE PRECISION NOT NULL,
      lng        DOUBLE PRECISION NOT NULL,
      estado     TEXT NOT NULL DEFAULT 'novo',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(
    'CREATE INDEX IF NOT EXISTS idx_propostos_estado ON lugares_propostos(estado, id DESC)'
  );
  await query(`ALTER TABLE lugares_propostos ADD COLUMN IF NOT EXISTS tipo TEXT`);

  // A morada, como o OpenStreetMap a quer.
  //
  // O OpenStreetMap não guarda um sítio só com nome e coordenadas — quer
  // saber onde ele fica na divisão administrativa. Quem propõe um nome pela
  // app passa a poder dar essa informação, e o que chega ao painel deixa de
  // ser "um nome num ponto" e passa a ser uma proposta que se consegue
  // mesmo submeter.
  //
  // Tudo opcional. Um passageiro com pressa escreve só o nome, e isso
  // continua a valer mais do que nada.
  await query(`ALTER TABLE lugares_propostos ADD COLUMN IF NOT EXISTS endereco  TEXT`);
  await query(`ALTER TABLE lugares_propostos ADD COLUMN IF NOT EXISTS municipio TEXT`);
  await query(`ALTER TABLE lugares_propostos ADD COLUMN IF NOT EXISTS posto     TEXT`);
  await query(`ALTER TABLE lugares_propostos ADD COLUMN IF NOT EXISTS suco      TEXT`);
  await query(`ALTER TABLE lugares_propostos ADD COLUMN IF NOT EXISTS aldeia    TEXT`);
  // O bairro não é um nível administrativo — não está no diploma nem no
  // conjunto da ONU. Mas é como as pessoas em Díli dizem onde moram, e um
  // endereço sem ele fica irreconhecível para quem lá vive.
  await query(`ALTER TABLE lugares_propostos ADD COLUMN IF NOT EXISTS bairro    TEXT`);
  // O nome sem acentos e em minúsculas, para a busca.
  //
  // O `ILIKE` do Postgres não ignora acentos: sem isto, quem escreve
  // "liquica" não encontra "Liquiçá". A extensão `unaccent` resolvia, mas
  // punha a busca a depender de uma extensão que pode não existir na base
  // seguinte — e um restauro que perde a busca é um restauro incompleto.
  await query(`ALTER TABLE lugares_propostos ADD COLUMN IF NOT EXISTS nome_busca TEXT`);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_propostos_busca
       ON lugares_propostos(nome_busca) WHERE estado IN ('novo','aceite')`
  );
  // Preenche o que ficou para trás. Corre a cada arranque e não custa nada
  // quando não há nada a fazer — mas resolve sozinho o dia em que houver.
  const porNormalizar = await query(
    `SELECT id, nome FROM lugares_propostos WHERE nome_busca IS NULL LIMIT 5000`
  );
  for (const r of porNormalizar) {
    await query('UPDATE lugares_propostos SET nome_busca = $2 WHERE id = $1', [
      r.id,
      normalizar(r.nome),
    ]);
  }
  if (porNormalizar.length) {
    console.log(`[db] ${porNormalizar.length} nome(s) de lugar normalizados para a busca`);
  }
  // Para procurar depressa as aldeias já escritas num suco. É a consulta
  // que faz o campo da aldeia aprender.
  await query(`CREATE INDEX IF NOT EXISTS idx_propostos_aldeia ON lugares_propostos(suco, aldeia)`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT`);

  await query(
    `ALTER TABLE rides ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id)`
  );
  // A rota é calculada para fixar o preço; guardá-la evita pedir outra vez
  // ao OSRM só para mostrar quanto tempo demora a viagem.
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS distance_km REAL`);
  // Porque é que a viagem foi cancelada. Guardado como código curto e não
  // como texto livre: serve para contar padrões, não para ler histórias.
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS cancel_reason TEXT`);
  // Quantas pessoas vão na viagem. Só faz sentido em carro — numa
  // motorizada vai sempre uma.
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS passengers INTEGER`);
  // Lugares do carro, SEM contar o motorista.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_seats INTEGER`);

  // Código que o passageiro diz ao motorista para a viagem começar. Prova
  // que quem entrou no carro é quem pediu, e impede o motorista de marcar
  // viagens que não fez.
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_code TEXT`);
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ`);
  // A restrição original não conhecia 'in_progress'. Substituí-la em vez
  // de a apagar: uma coluna de estado sem restrição aceita erros de
  // escrita para sempre e só se descobre quando a app não sabe desenhar
  // um estado que não existe.
  await query(`ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_status_check`);
  await query(`
    ALTER TABLE rides ADD CONSTRAINT rides_status_check
    CHECK (status IN ('requested','accepted','arriving','in_progress','completed','cancelled'))
  `);

  // Validade dos documentos. Guardar a imagem sem a data dá aparência de
  // legalidade sem a substância: uma carta caducada é pior do que nenhuma,
  // porque passou por uma verificação.
  await query(`ALTER TABLE driver_documents ADD COLUMN IF NOT EXISTS expires_on DATE`);

  // O cartão de inspecção do veículo — Kartaun Inspesaun.
  //
  // Obrigatório em Timor-Leste e válido um ano. Conduzir com ele caducado e
  // ser mandado parar pela polícia de trânsito custa multa a DOBRAR. É por
  // isso que entra: não é papelada nossa, é dinheiro do motorista.
  //
  // A restrição antiga não o conhecia. Substituí-la em vez de a apagar: uma
  // coluna sem restrição aceita erros de escrita para sempre.
  await query(`ALTER TABLE driver_documents DROP CONSTRAINT IF EXISTS driver_documents_kind_check`);
  await query(`
    ALTER TABLE driver_documents ADD CONSTRAINT driver_documents_kind_check
    CHECK (kind IN ('licence', 'vehicle', 'photo', 'inspection', 'identity'))
  `);

  // Porque é que um documento já verificado foi substituído.
  //
  // Depois de aprovado, substituir deixou de ser um gesto livre: obriga a
  // dizer porquê. Não é burocracia — é o que transforma "este documento
  // mudou" em "este documento mudou POR ISTO", e é a diferença entre um
  // registo que se consegue auditar e um que só mostra o estado de hoje.
  //
  // Guardado no documento e não à parte: o que interessa saber é o motivo da
  // ÚLTIMA substituição, e é esse que fica ao lado da fotografia no painel.
  await query(`ALTER TABLE driver_documents ADD COLUMN IF NOT EXISTS motivo_atualizacao TEXT`);
  // Quando alguém do painel confirmou o documento novo. Comparado com o
  // `created_at`: se for anterior, é porque o documento mudou depois da
  // última revisão e está por rever outra vez.
  await query(`ALTER TABLE driver_documents ADD COLUMN IF NOT EXISTS revisto_em TIMESTAMPTZ`);

  // Foto do turno: quem está ao volante HOJE. Os documentos verificam a
  // conta; isto verifica a pessoa. Um motorista aprovado que empresta o
  // telemóvel ao primo é o problema mais comum deste negócio.
  await query(`
    CREATE TABLE IF NOT EXISTS driver_shifts (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      dia        DATE NOT NULL,
      mime       TEXT NOT NULL,
      bytes      BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, dia)
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_turnos_dia ON driver_shifts(dia DESC)');
  // Mensagens automáticas do serviço não têm remetente humano.
  await query(`ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS kind TEXT`);
  // Prova de que os termos foram aceites, e qual versão. A versão importa:
  // se os termos mudarem, é preciso saber quem aceitou o quê.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_terms_version TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_terms_accepted_at TIMESTAMPTZ`);
  // O consentimento da privacidade, guardado à parte do dos termos.
  //
  // São actos jurídicos distintos e mudam em alturas distintas: corrigir uma
  // cláusula dos termos não devia invalidar o que alguém aceitou sobre o
  // tratamento dos seus dados, nem o contrário. Guardados juntos, não havia
  // forma de saber quem tinha aceitado o quê.
  //
  // Fica a NULL para quem se registou antes disto existir, e isso é a
  // resposta honesta: essas pessoas nunca deram este consentimento, porque
  // nunca lho perguntámos.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_version TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ`);
  await query(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS duration_min INTEGER`);

  await query('CREATE INDEX IF NOT EXISTS idx_docs_user ON driver_documents(user_id)');

  // Registo de acessos da administração ao conteúdo privado.
  //
  // O painel dá ao administrador acesso a tudo, incluindo as conversas
  // entre passageiro e motorista. Numa denúncia ou numa disputa, ler essa
  // conversa é legítimo e às vezes é a única prova que existe.
  //
  // O que separa isso de vigilância não é o código — é ficar registado
  // quem leu o quê e quando. Sem registo, "acesso total" e "ninguém
  // responde por nada" são a mesma coisa. Com registo, um dia é possível
  // responder à pergunta que um regulador ou um tribunal vai fazer.
  //
  // Só o conteúdo privado é registado. Listas e números não — registar
  // tudo enche o registo de ruído e esconde o que interessa.
  await query(`
    CREATE TABLE IF NOT EXISTS admin_acessos (
      id         SERIAL PRIMARY KEY,
      admin_id   INTEGER NOT NULL REFERENCES users(id),
      que        TEXT NOT NULL,
      alvo_id    INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_acessos_data ON admin_acessos(created_at DESC)');
  // Que tipo de emergência foi pedida. Sem isto, quem responde não sabe
  // se manda uma ambulância ou chama a polícia.
  await query(`ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS tipo TEXT`);

  // Suspender não é recusar. Recusar é "nunca entraste"; suspender é
  // "entraste e há um problema" — e um problema pode resolver-se. Sem este
  // estado, uma queixa séria só tinha duas respostas: ignorar ou expulsar.
  await query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_driver_status_check`);
  await query(`
    ALTER TABLE users ADD CONSTRAINT users_driver_status_check
    CHECK (driver_status IS NULL OR driver_status IN ('pending','approved','rejected','suspended'))
  `);
  // Porquê e por quem. Uma decisão sobre a vida de alguém não pode ser um
  // campo sem historial.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_status_motivo TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_status_em TIMESTAMPTZ`);
  await query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_status_por INTEGER REFERENCES users(id)`
  );
  await query('CREATE INDEX IF NOT EXISTS idx_sos_aberto ON sos_alerts(resolved, created_at DESC)');
  await query(
    "CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online) WHERE role = 'driver'"
  );

  const [{ now }] = await query('SELECT NOW() AS now');
  console.log('[db] PostgreSQL pronto —', now.toISOString());
}
