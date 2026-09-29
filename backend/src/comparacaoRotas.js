// AS ROTAS NOSSAS AO LADO DAS DO GOOGLE (29/09/2026).
//
// Estava em rotasNossas.js e saiu quando o mapa passou para a sua pasta
// (backend/mapa/, 29/09/2026): o mapa não usa base de dados, e isto usa — é
// a app a medir o mapa, não o mapa a medir-se.
import { query, one } from './db.js';
import { rotaNossa, sobreARede } from '../mapa/index.js';

// ── A COMPARAÇÃO COM O GOOGLE, em viagens reais (29/09/2026) ───────────
//
// Cada cotação com rota do Google calcula também a nossa (1–3 ms) e guarda
// as duas distâncias. O passageiro não vê nada, e o preço continua a ser o do
// Google. É o que diz, com viagens de verdade e não com as quatro que havia,
// se as rotas do OpenStreetMap servem para a navegação dos motoristas.
//
// UMA VEZ POR PERCURSO a cada dez minutos: a procura automática da app refaz
// a cotação de 20 em 20 segundos, e sem isto o mesmo percurso entrava trinta
// vezes e a mediana passava a ser a de quem ficou mais tempo à espera.
const COMPARACOES_MAX = 500;
const JA_COMPARADO_MS = 10 * 60 * 1000;
const jaComparado = new Map();

export function compararComGoogle(a, b, google) {
  if (google?.fonte !== 'google' || !Number.isFinite(google.km)) return;
  if (!sobreARede().existe) return;
  const chaveP = [a.lat, a.lng, b.lat, b.lng].map((x) => Number(x).toFixed(4)).join(',');
  const agora = Date.now();
  if (agora - (jaComparado.get(chaveP) || 0) < JA_COMPARADO_MS) return;
  jaComparado.set(chaveP, agora);
  if (jaComparado.size > 1000) jaComparado.delete(jaComparado.keys().next().value);

  let nossa = null;
  try {
    nossa = rotaNossa(a, b);
  } catch (e) {
    // Um erro nas rotas nossas nunca pode tocar na cotação de ninguém.
    console.error('[rotas nossas] falhou:', e.message);
    return;
  }
  query(
    `INSERT INTO comparacao_rotas (km_google, km_nossa, min_google, min_nossa)
     VALUES ($1, $2, $3, $4)`,
    [google.km, nossa ? nossa.km : null, google.min ?? null, nossa ? nossa.min : null]
  )
    .then(() =>
      query(
        `DELETE FROM comparacao_rotas WHERE id <= (SELECT MAX(id) FROM comparacao_rotas) - $1`,
        [COMPARACOES_MAX]
      )
    )
    .catch(() => {});
}

// Para o /api/health: a rede, e o resumo das comparações.
export async function estadoDasRotasNossas() {
  const base = sobreARede();
  try {
    const r = await one(
      `SELECT count(*)::int AS n,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY km_nossa / NULLIF(km_google, 0)) AS mediana,
              count(*) FILTER (WHERE km_nossa IS NULL)::int AS sem_rota,
              count(*) FILTER (WHERE abs(km_nossa / NULLIF(km_google, 0) - 1) > 0.15)::int AS longe
         FROM comparacao_rotas`
    );
    const ultimas = await query(
      `SELECT km_google, km_nossa, quando FROM comparacao_rotas ORDER BY id DESC LIMIT 10`
    );
    return {
      ...base,
      comparacoes: {
        n: r.n,
        medianaNossaSobreGoogle:
          r.mediana != null ? Math.round(Number(r.mediana) * 100) / 100 : null,
        semRota: r.sem_rota,
        maisDe15porCento: r.longe,
        ultimas,
      },
    };
  } catch {
    return base;
  }
}
