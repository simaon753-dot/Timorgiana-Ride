// Diz, em português, se a busca do Google está ligada e a funcionar.
//
// Existe porque a resposta a essa pergunta estava dentro de um JSON que é
// preciso saber ler, e porque o modo de falhar desta camada é o pior que
// há: silencioso. Sem chave, sem facturação ou com a quota esgotada, a
// busca continua a devolver resultados — só que menos, e vindos apenas do
// OpenStreetMap. Ninguém repara.
//
// Usar:
//   npm run verificar-google
//   TELEMOVEL=77xxxxxx SENHA=... npm run verificar-google
//
// Sem telemóvel faz só a pergunta ao /api/health. Com telemóvel entra na
// conta e faz uma busca a sério, que é a única prova que vale: o campo
// `fonte` da resposta diz de onde vieram os resultados.

const SERVIDOR = process.env.API_URL || 'https://timorgiana-ride.onrender.com';
const TERMO = process.env.TERMO || 'Timor Plaza';
const PRAZO_MS = 60000; // o plano gratuito do Render adormece; acordar demora

function linha() {
  console.log('─'.repeat(64));
}

async function pedir(caminho, opcoes = {}) {
  const ctrl = new AbortController();
  const relogio = setTimeout(() => ctrl.abort(), PRAZO_MS);
  try {
    const r = await fetch(`${SERVIDOR}${caminho}`, { ...opcoes, signal: ctrl.signal });
    const texto = await r.text();
    let corpo = null;
    try {
      corpo = JSON.parse(texto);
    } catch {
      corpo = null;
    }
    return { http: r.status, corpo, texto };
  } finally {
    clearTimeout(relogio);
  }
}

// Traduz o erro do Google para uma frase que diga o que fazer a seguir.
// O corpo que o Google devolve é claro, mas está em inglês e enterrado.
function explicarErro(erro) {
  const diz = String(erro.diz || '').toUpperCase();
  if (erro.http === 403 && diz.includes('BILLING')) {
    return 'A conta de facturação está fechada ou não está ligada ao projecto.';
  }
  if (erro.http === 403 && (diz.includes('SERVICE_DISABLED') || diz.includes('NOT BEEN USED'))) {
    return 'A Places API (New) não está activada neste projecto.';
  }
  if (erro.http === 403) {
    return 'A chave foi recusada — ver as restrições da chave na consola.';
  }
  if (erro.http === 400 && diz.includes('API KEY')) {
    return 'A chave está errada ou mal copiada (espaços, aspas, letra a menos).';
  }
  if (erro.http === 429 || diz.includes('RESOURCE_EXHAUSTED') || diz.includes('QUOTA')) {
    return 'A quota foi atingida. As chamadas voltam quando a quota renovar.';
  }
  if (erro.http === 0) {
    return 'O servidor não conseguiu falar com o Google (rede ou tempo esgotado).';
  }
  return 'Erro não previsto — ler o texto acima.';
}

async function principal() {
  console.log(`\nServidor: ${SERVIDOR}`);
  linha();

  let saude;
  try {
    saude = await pedir('/api/health');
  } catch (e) {
    console.log('✗ O servidor não respondeu.');
    console.log(`  ${e?.message || e}`);
    console.log('\n  Se está no plano gratuito do Render, pode estar a dormir.');
    console.log('  Tente outra vez daqui a um minuto.\n');
    process.exitCode = 1;
    return;
  }

  const s = saude.corpo;
  if (!s) {
    console.log(`✗ Resposta inesperada (HTTP ${saude.http}):`);
    console.log(`  ${saude.texto.slice(0, 200)}\n`);
    process.exitCode = 1;
    return;
  }

  console.log(`  versão no ar : ${s.versao}`);
  console.log(`  base de dados: ${s.database}`);
  console.log(`  na memória   : ${s.busca?.memoria ?? 0} buscas guardadas`);
  linha();

  const ligada = s.busca?.google === true;
  const erro = s.busca?.ultimoErroGoogle;

  if (!ligada) {
    console.log('○ A busca do Google está DESLIGADA.');
    console.log('  A app funciona: procura só no OpenStreetMap.');
    console.log('\n  Para ligar, no Render → Environment:');
    console.log('    GOOGLE_MAPS_KEY = a chave');
    console.log('  O servidor reinicia sozinho ao gravar.\n');
    return;
  }

  if (erro) {
    console.log('✗ A chave está posta, mas o Google RECUSOU a última chamada.');
    console.log(`\n  quando : ${erro.quando}`);
    console.log(`  HTTP   : ${erro.http}`);
    console.log(`  diz    : ${String(erro.diz).slice(0, 200)}`);
    console.log(`\n  Provavelmente: ${explicarErro(erro)}\n`);
    process.exitCode = 1;
    return;
  }

  console.log('✓ A chave está posta e a última chamada correu bem.');

  // Até aqui só sabemos que a chave existe e que nada rebentou. Se ninguém
  // procurou nada desde o arranque, `ultimoErroGoogle` é null por não ter
  // havido chamada nenhuma — o que parece bom e não prova nada. A prova é
  // fazer uma busca.
  const telemovel = process.env.TELEMOVEL;
  const senha = process.env.SENHA;
  if (!telemovel || !senha) {
    console.log('\n  Isto ainda não é prova: se ninguém procurou nada desde');
    console.log('  o arranque, não houve chamada nenhuma para falhar.');
    console.log('\n  Para a prova a sério, com uma conta da app:');
    console.log('    TELEMOVEL=77xxxxxx SENHA=... npm run verificar-google\n');
    return;
  }

  linha();
  console.log(`  A entrar na conta ${telemovel} e a procurar "${TERMO}"...`);

  const entrada = await pedir('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: telemovel, password: senha }),
  });
  const token = entrada.corpo?.token;
  if (!token) {
    console.log(`\n✗ Não foi possível entrar (HTTP ${entrada.http}).`);
    console.log(`  ${entrada.corpo?.error || entrada.texto.slice(0, 150)}\n`);
    process.exitCode = 1;
    return;
  }

  const busca = await pedir(`/api/lugares?q=${encodeURIComponent(TERMO)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (busca.http !== 200) {
    console.log(`\n✗ A busca falhou (HTTP ${busca.http}).`);
    console.log(`  ${busca.corpo?.error || busca.texto.slice(0, 150)}\n`);
    process.exitCode = 1;
    return;
  }

  const fonte = String(busca.corpo?.fonte || '');
  const lugares = busca.corpo?.lugares || [];
  console.log(`\n  fonte: ${fonte}`);
  for (const l of lugares.slice(0, 5)) {
    console.log(`    ${l.fonte === 'google' ? '[G]' : l.fonte === 'osm' ? '[O]' : '[N]'} ${l.label}`);
  }

  console.log('');
  if (fonte.includes('google')) {
    console.log('✓ CONFIRMADO: o Google respondeu e os resultados dele estão a entrar.\n');
  } else if (fonte.includes('memoria')) {
    console.log('○ A resposta veio da memória de 24 horas, não do Google.');
    console.log(`  Repita com outro termo:  TERMO="outra coisa" npm run verificar-google\n`);
  } else {
    console.log('✗ O Google não devolveu nada para este termo.');
    console.log('  Ou não conhece o sítio, ou a chamada falhou em silêncio.');
    console.log('  Volte a correr este script sem TELEMOVEL para ver o erro.\n');
    process.exitCode = 1;
  }
}

principal();
