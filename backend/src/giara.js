import { query, tx } from './db.js';
import { normalizar } from './texto.js';
import { categoriaGiara } from './giaraCategorias.js';

// OS LUGARES DO TIMORGIANA MAPS (GIARA) NA PESQUISA DA APP (07/10/2026,
// pedido do Simão: «liga os dois mapas»).
//
// O Giara é onde se corrige e publica o mapa; a TimorgianaRide vai lá buscar
// o que estiver PUBLICADO e guarda uma cópia em `lugares_giara`. A pesquisa
// e a lista «perto daqui» leem essa cópia (lugaresNossos.js), nunca o Giara
// diretamente: um passageiro não pode ficar à espera de outro servidor, que
// no plano gratuito do Render ainda por cima adormece.
//
// QUANDO: no arranque (com folga) e de seis em seis horas. Se a versão
// publicada for a mesma da última vez, não se mexe em nada.
//
// SÓ PONTOS COM NOME: locais, pontos de recolha e paragens. Estradas,
// edifícios e limites são do mapa, não da pesquisa.
//
// SEM DUPLICADOS. Os primeiros 96 lugares do Giara vieram daqui
// (scripts/lugares-para-giara.mjs). O mapa público não diz de onde veio cada
// um, por isso reconhece-se assim: o mesmo nome a menos de 30 metros de um
// lugar já aceite na TimorgianaRide é o mesmo lugar, e fica de fora.
//
// O Giara manda: o que lá for arquivado sai daqui na sincronização seguinte.
const GIARA = (process.env.GIARA_URL || 'https://giara-maps.onrender.com').replace(/\/$/, '');
const desligado = () => process.env.GIARA_URL === 'off';

// Timor-Leste inteiro, com Oecusse e Ataúro (a mesma caixa do mapa próprio).
const PAIS = [123.85, -9.6, 127.4, -8.05];
const LIMITE = 500; // o máximo que o Giara devolve por pedido
const TIPOS = new Set(['place', 'pickup', 'stop']);
const MESMO_SITIO_M = 30;

// Os erros daqui nunca chegam à app: ficam nos registos e no /api/health,
// para o administrador. Por isso não passam pelo mensagens.js (tétum/inglês),
// e têm o seu próprio tipo, que o verificador de mensagens não confunde com
// os que vão para o telemóvel.
class FalhaGiara extends Error {}

let estado = { ligado: !desligado(), lugares: 0, versao: null, ultima: null, erro: null };
export const estadoGiara = () => ({ ...estado, ligado: !desligado() });

async function pedir(caixa) {
  const url = `${GIARA}/map/features?bbox=${caixa.join(',')}&limit=${LIMITE}`;
  // O Giara pode estar a dormir: até um minuto para acordar.
  const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new FalhaGiara(`o Giara respondeu ${r.status}`);
  return r.json();
}

// Uma caixa com mais de 500 elementos volta «truncada»: parte-se em quatro e
// pede-se cada parte. Díli inteira cabe numa caixa pequena, por isso isto
// só se nota quando o mapa crescer.
async function tudoNaCaixa(caixa, versoes, fundo = 0) {
  const r = await pedir(caixa);
  versoes.add(r.version ?? null);
  if (!r.truncated) return r.features ?? [];
  if (fundo >= 8) throw new FalhaGiara('o Giara tem demasiados elementos num só sítio');
  const [o, s, e, n] = caixa;
  const mx = (o + e) / 2;
  const my = (s + n) / 2;
  const partes = await Promise.all(
    [
      [o, s, mx, my],
      [mx, s, e, my],
      [o, my, mx, n],
      [mx, my, e, n],
    ].map((c) => tudoNaCaixa(c, versoes, fundo + 1))
  );
  return partes.flat();
}

function metros(a, b) {
  const dLat = (b.lat - a.lat) * 111320;
  const dLng = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

export function lugaresDoGiara(features, nossos) {
  const vistos = new Map();
  for (const f of features) {
    const p = f?.properties ?? {};
    if (f?.geometry?.type !== 'Point' || !TIPOS.has(p.kind)) continue;
    const nome = String(p.name ?? '').trim();
    if (!nome) continue;
    const [lng, lat] = f.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const busca = normalizar(nome);
    const sitio = { lat, lng };
    if (nossos.some((x) => x.busca === busca && metros(x, sitio) < MESMO_SITIO_M)) continue;
    // A mesma caixa partida em quatro pode devolver um elemento duas vezes.
    vistos.set(String(f.id), {
      id: String(f.id),
      nome,
      busca,
      lat,
      lng,
      tipo: p.kind,
      categoria: p.category || null,
      municipio: p.municipality || null,
      posto: p.administrativePost || null,
      suco: p.suco || null,
      aldeia: p.aldeia || null,
      bairro: p.neighborhood || null,
    });
  }
  return [...vistos.values()];
}

export async function sincronizarGiara() {
  if (desligado()) return { saltado: 'desligado' };
  try {
    const versoes = new Set();
    const features = await tudoNaCaixa(PAIS, versoes);
    // Se a versão mudou A MEIO (publicaram enquanto se pedia), os pedaços
    // não batem certo: tenta-se na vez seguinte.
    if (versoes.size !== 1) throw new FalhaGiara('o Giara publicou durante a sincronização');
    const [versao] = versoes;
    if (versao && versao === estado.versao) {
      estado = { ...estado, ultima: new Date().toISOString(), erro: null };
      return { saltado: 'mesma versão' };
    }

    const nossos = (
      await query(
        `SELECT nome_busca AS busca, lat, lng FROM lugares_propostos
          WHERE estado = 'aceite' AND nome_busca IS NOT NULL`
      )
    ).map((r) => ({ busca: r.busca, lat: Number(r.lat), lng: Number(r.lng) }));
    const lugares = lugaresDoGiara(features, nossos);

    // Tudo ou nada: a pesquisa nunca vê a tabela meio refeita.
    await tx(async (c) => {
      await c.query('DELETE FROM lugares_giara');
      for (const l of lugares) {
        await c.query(
          `INSERT INTO lugares_giara (feature_id, nome, nome_busca, lat, lng, tipo, categoria,
                                      municipio, posto, suco, aldeia, bairro, versao)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            l.id,
            l.nome,
            l.busca,
            l.lat,
            l.lng,
            l.tipo,
            l.categoria,
            l.municipio,
            l.posto,
            l.suco,
            l.aldeia,
            l.bairro,
            String(versao),
          ]
        );
      }
    });

    estado = {
      ligado: true,
      lugares: lugares.length,
      versao,
      ultima: new Date().toISOString(),
      erro: null,
    };
    console.log(
      `[giara] ${lugares.length} lugar(es) novos de ${features.length} publicados (versão ${versao})`
    );
    return { lugares: lugares.length, publicados: features.length };
  } catch (e) {
    estado = { ...estado, ultima: new Date().toISOString(), erro: e.message };
    console.error('[giara]', e.message);
    return { erro: e.message };
  }
}

// ── NO OUTRO SENTIDO: os lugares aceites aqui vão para o Giara (07/10/2026) ──
//
// Pedido do Simão: um nome aceite no painel da TimorgianaRide deve chegar ao
// Giara sozinho. Chega como PROPOSTA, num rascunho «Lugares novos da
// TimorgianaRide» em nome do Super Admin: nada aparece no mapa público sem
// ele rever e publicar, como qualquer edição feita no editor.
//
// Uma chave partilhada (GIARA_INTEGRACAO_TOKEN aqui, MAP_INTEGRATION_TOKEN no
// Giara, o MESMO valor). Sem ela, não se envia nada e o /api/health diz
// porquê. O Giara não aceita o mesmo lugar duas vezes (pelo «tgr-N»), por isso
// reenviar é seguro — e é o que a passagem de 10 em 10 minutos faz ao que
// tenha falhado (o Giara a dormir, sem rede).
const LOTE = 100; // o máximo que o Giara aceita por pedido
let aEnviar = false;
let envio = { ligado: false, enviados: 0, ultimo: null, erro: null };
export const estadoEnvioGiara = () => ({ ...envio, ligado: !!chave() });
const chave = () => process.env.GIARA_INTEGRACAO_TOKEN?.trim() || null;

export async function enviarAoGiara() {
  if (desligado() || !chave()) return { saltado: 'sem chave' };
  if (aEnviar) return { saltado: 'já a enviar' };
  aEnviar = true;
  try {
    let total = 0;
    for (;;) {
      const lugares = await query(
        `SELECT id, nome, lat, lng, tipo, tipo_outro, municipio, posto, suco, aldeia, bairro, endereco
           FROM lugares_propostos
          WHERE estado = 'aceite' AND giara_enviado_em IS NULL
          ORDER BY id
          LIMIT ${LOTE}`
      );
      if (!lugares.length) break;
      const places = lugares.map((l) => ({
        id: `tgr-${l.id}`,
        name: l.nome.trim().slice(0, 300),
        lat: Number(l.lat),
        lng: Number(l.lng),
        category: categoriaGiara(l),
        municipality: l.municipio || null,
        administrativePost: l.posto || null,
        suco: l.suco || null,
        aldeia: l.aldeia || null,
        neighborhood: l.bairro || null,
        address: l.endereco || null,
        description: l.tipo === 'outro' && l.tipo_outro ? l.tipo_outro : null,
      }));
      const r = await fetch(`${GIARA}/editor-api/integrations/timorgianaride/places`, {
        method: 'POST',
        headers: { authorization: `Bearer ${chave()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ places }),
        // O Giara pode estar a dormir: até um minuto para acordar.
        signal: AbortSignal.timeout(60_000),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok)
        throw new FalhaGiara(`o Giara recusou as propostas (${r.status}): ${corpo?.error ?? ''}`);
      await query(
        'UPDATE lugares_propostos SET giara_enviado_em = NOW() WHERE id = ANY($1::int[])',
        [lugares.map((l) => l.id)]
      );
      total += Number(corpo.added) || 0;
      if (lugares.length < LOTE) break;
    }
    envio = {
      ligado: true,
      enviados: envio.enviados + total,
      ultimo: new Date().toISOString(),
      erro: null,
    };
    if (total) console.log(`[giara] ${total} lugar(es) proposto(s) ao Giara`);
    return { propostos: total };
  } catch (e) {
    envio = { ...envio, ultimo: new Date().toISOString(), erro: e.message };
    console.error('[giara] envio:', e.message);
    return { erro: e.message };
  } finally {
    aEnviar = false;
  }
}
