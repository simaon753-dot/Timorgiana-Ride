import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { rotaPorPontos } from './rotas.js';
import { mosaico } from './mosaicos.js';

// A NAVEGAÇÃO NOSSA, SEM GOOGLE — o passo 3 (29/09/2026).
//
//   /navegar?para=LAT,LNG&nome=…&lingua=pt|tet|en
//
// Uma página que o motorista abre a partir do «Navegar» da app: o nosso mapa,
// as rotas nossas (rotas.js), o GPS do telemóvel e a voz. Não precisa
// de APK — é uma página — e não depende do Google em nada.
//
// PÚBLICA, SEM CONTA. Uma rota é só geometria entre dois pontos que quem pede
// já conhece; não há nada de ninguém para proteger. O que se protege é o
// servidor: um limite de pedidos por endereço (ver `limite`), porque cada rota
// é trabalho nosso e o plano é gratuito.
//
// O MOTOR DO MAPA (MapLibre 6) É SERVIDO DAQUI e não de um distribuidor de
// fora: a versão 6 arranca um «worker» a partir do endereço do próprio
// ficheiro, e o navegador não deixa arrancar workers de outro domínio. E é
// coerente com o resto: um mapa sem Google que dependesse de terceiros para
// abrir não seria bem nosso. Licença BSD-3, ao lado dos ficheiros.

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PASTA = path.join(AQUI, 'publico', 'navegar');

// Só estes ficheiros, e nenhum outro caminho: um nome vindo do pedido nunca
// chega ao sistema de ficheiros sem estar nesta lista.
const FICHEIROS = {
  'index.html': 'text/html; charset=utf-8',
  'app.js': 'text/javascript; charset=utf-8',
  'vendor/maplibre-6.10.0/maplibre-gl.mjs': 'text/javascript; charset=utf-8',
  'vendor/maplibre-6.10.0/maplibre-gl-shared.mjs': 'text/javascript; charset=utf-8',
  'vendor/maplibre-6.10.0/maplibre-gl-worker.mjs': 'text/javascript; charset=utf-8',
  'vendor/maplibre-6.10.0/maplibre-gl.css': 'text/css; charset=utf-8',
  'vendor/maplibre-6.10.0/LICENSE.txt': 'text/plain; charset=utf-8',
};

// Comprimidos uma vez e guardados: são ~1,2 MB por comprimir e ~300 KB
// comprimidos, e os dados em Timor-Leste compram-se ao megabyte.
const cache = new Map();
function servir(req, res, nome) {
  const tipo = FICHEIROS[nome];
  if (!tipo) return res.status(404).end();
  let f = cache.get(nome);
  if (!f) {
    const bruto = fs.readFileSync(path.join(PASTA, nome));
    f = { bruto, gz: gzipSync(bruto) };
    cache.set(nome, f);
  }
  res.setHeader('Content-Type', tipo);
  // A biblioteca tem a versão no caminho e pode ficar guardada um ano; a
  // página e o app.js mudam com cada publicação e revalidam-se sempre.
  res.setHeader(
    'Cache-Control',
    nome.startsWith('vendor/') ? 'public, max-age=31536000, immutable' : 'no-cache'
  );
  res.setHeader('Vary', 'Accept-Encoding');
  if (/\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) {
    res.setHeader('Content-Encoding', 'gzip');
    return res.end(f.gz);
  }
  return res.end(f.bruto);
}

// Trinta rotas por minuto e por endereço: um motorista a conduzir pede uma
// no início e outra a cada desvio — muito abaixo disto.
const JANELA_MS = 60 * 1000;
const MAX_POR_JANELA = 30;
const pedidos = new Map();
function limite(req, res, next) {
  const agora = Date.now();
  const ip = req.ip || 'desconhecido';
  const r = pedidos.get(ip);
  if (!r || agora - r.inicio > JANELA_MS) pedidos.set(ip, { inicio: agora, n: 1 });
  else if (++r.n > MAX_POR_JANELA) return res.status(429).json({ erro: 'demasiados-pedidos' });
  if (pedidos.size > 5000) pedidos.clear();
  return next();
}

// Um ponto dentro de Timor-Leste (com margem), ou null.
function ponto(texto) {
  const [lat, lng] = String(texto || '')
    .split(',')
    .map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -9.8 || lat > -8.0 || lng < 123.8 || lng > 127.6) return null;
  return { lat, lng };
}

// TUDO O QUE O MAPA SERVE, num só router (desde 29/09/2026, quando o mapa
// passou para backend/mapa/): o mapa de Timor-Leste e o estilo em /mapa, a
// navegação em /navegar. Os endereços são os de sempre.
export const mapaRouter = Router();

mapaRouter.get('/navegar', (req, res) => servir(req, res, 'index.html'));
mapaRouter.get('/navegar/app.js', (req, res) => servir(req, res, 'app.js'));
mapaRouter.get('/navegar/vendor/:versao/:ficheiro', (req, res) =>
  servir(req, res, `vendor/${req.params.versao}/${req.params.ficheiro}`)
);

// GET /navegar/rota?de=LAT,LNG&para=LAT,LNG[&via=LAT,LNG;LAT,LNG]
//
// `via`: as paragens pelo meio, por ordem — no máximo duas, como no Pickup.
mapaRouter.get('/navegar/rota', limite, (req, res) => {
  const de = ponto(req.query.de);
  const para = ponto(req.query.para);
  const textoVia = String(req.query.via || '').trim();
  const via = textoVia ? textoVia.split(';').map(ponto) : [];
  if (!de || !para || via.some((p) => !p) || via.length > 2) {
    return res.status(400).json({ erro: 'pontos-invalidos' });
  }
  let r = null;
  try {
    r = rotaPorPontos([de, ...via, para]);
  } catch (e) {
    console.error('[navegar] rota:', e.message);
    return res.status(500).json({ erro: 'falhou' });
  }
  if (!r) return res.status(404).json({ erro: 'sem-rota' });
  const corpo = Buffer.from(JSON.stringify(r));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (/\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) {
    res.setHeader('Content-Encoding', 'gzip');
    return res.end(gzipSync(corpo));
  }
  return res.end(corpo);
});

// ── O MAPA PRÓPRIO (/mapa), que antes vivia em src/server.js ─────────────
//
// São 33 MB com Timor-Leste inteiro, do país à rua. Fica no repositório e o
// Render serve-o — não há terceiro serviço, não há conta nova, não há chave
// que possa ser revogada. É a única dependência do mapa que não pode fechar
// por causa de uma facturação.
//
// PEDIDOS POR TROÇOS, e é o que faz isto funcionar. O formato PMTiles é um
// ficheiro só, e quem o lê pede apenas os bytes dos mosaicos que está a
// mostrar — uns kilobytes por ecrã, não os 33 MB. O `sendFile` do Express
// responde a `Range` sozinho; sem isso, cada abertura do mapa descarregava o
// país inteiro.
//
// CORS aberto porque quem pede é a app e o painel, de outra origem. O
// ficheiro é público por natureza: são dados do OpenStreetMap.
mapaRouter.get('/mapa/timor-leste.pmtiles', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, ETag');
  // Um mês. O mapa só muda quando alguém correr a receita outra vez.
  res.setHeader('Cache-Control', 'public, max-age=2592000');
  res.sendFile(path.join(AQUI, 'publico', 'timor-leste.pmtiles'));
});

// OS MOSAICOS, um a um, num endereço que qualquer motor de mapas entende.
// O MapLibre nativo do telemóvel não sabe ler `pmtiles://` — foi um APK
// instalado pelo Simão que o mostrou.
mapaRouter.get('/mapa/:z/:x/:y.mvt', async (req, res) => {
  const z = Number(req.params.z);
  const x = Number(req.params.x);
  const y = Number(req.params.y);
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 15) return res.status(400).end();
  try {
    const bruto = await mosaico(z, x, y);
    // Sem conteúdo e não erro: um mosaico vazio é o mar, ou um sítio onde não
    // há nada desenhado. O motor de mapas espera 204 e não estranha.
    if (!bruto) return res.status(204).end();
    res.setHeader('Content-Type', 'application/vnd.mapbox-vector-tile');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    // O leitor devolve o mosaico descomprimido; volta a comprimir-se antes de
    // sair — metade dos bytes, e a largura de banda é a conta a sério.
    if (/\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) {
      res.setHeader('Content-Encoding', 'gzip');
      return res.end(gzipSync(bruto));
    }
    return res.end(bruto);
  } catch (e) {
    console.error('[mapa] mosaico', z, x, y, e.message);
    return res.status(500).end();
  }
});

// O estilo, ao lado do mapa. SEPARADO do ficheiro dos mosaicos: mudar as
// cores é substituir um ficheiro de texto e publicar o servidor.
mapaRouter.get('/mapa/estilo.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(AQUI, 'publico', 'estilo.json'));
});
