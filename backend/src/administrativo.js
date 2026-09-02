import fs from 'node:fs';
import { normalizar } from './texto.js';

// A divisão administrativa de Timor-Leste: município, posto, suco.
//
// Gerado por scripts/gerar-administrativo.mjs a partir do conjunto oficial
// das Nações Unidas. Ver os comentários desse ficheiro para saber porque não
// veio do Jornal da República.
//
// FALTA O NÍVEL DAS ALDEIAS, e não por esquecimento: não existe em fonte
// legível nenhuma. Nem no conjunto da ONU, nem no OpenStreetMap. Só no
// diploma digitalizado, que não se consegue ler.
//
// A saída para isso está em `aldeiasConhecidas`: as aldeias aprendem-se de
// quem as escreve. O primeiro que escrever "Fomento" no suco de Comoro fica
// guardado, e o seguinte vê-o sugerido. Ao fim de uns meses há uma lista das
// aldeias que as pessoas realmente usam, feita por quem lá vive.

const dados = JSON.parse(
  fs.readFileSync(new URL('../dados/administrativo.json', import.meta.url), 'utf8')
);

export const MUNICIPIOS = dados.municipios;

export function acharMunicipio(nome) {
  const n = normalizar(nome);
  if (!n) return null;
  return MUNICIPIOS.find((m) => normalizar(m.nome) === n) ?? null;
}

export function acharPosto(municipio, nome) {
  const n = normalizar(nome);
  if (!municipio || !n) return null;
  return municipio.postos.find((p) => normalizar(p.nome) === n) ?? null;
}

// Descobre o município e o posto a partir das coordenadas.
//
// Pergunta ao Nominatim, que devolve a divisão administrativa a partir das
// fronteiras que o OpenStreetMap já tem desenhadas: `state` é o município e
// `state_district` é o posto. Confirmámos em Díli — um ponto no Timor Plaza
// devolve Dom Aleixo, Dili.
//
// É por isto que o formulário NÃO pede estes dois ao passageiro: pedir-lhos
// seria pedir que escrevesse o que já se sabe, e abrir a porta a enganar-se.
export async function ondeFica(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return {};
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1` +
    `&zoom=14&lat=${lat}&lon=${lng}`;
  try {
    const ctrl = new AbortController();
    const relogio = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TimorgianaRide/1.0 (app de transporte, Dili, Timor-Leste)',
      },
      signal: ctrl.signal,
    });
    clearTimeout(relogio);
    if (!r.ok) return {};
    const j = await r.json();
    const a = j?.address || {};

    const municipio = acharMunicipio(a.state);
    const posto = acharPosto(municipio, a.state_district);
    return {
      municipio: municipio ? { id: municipio.id, nome: municipio.nome } : null,
      posto: posto ? { id: posto.id, nome: posto.nome } : null,
      // O bairro que o OpenStreetMap conhece serve de sugestão para o campo
      // da aldeia — muitas vezes é o mesmo nome.
      sugestaoAldeia: a.neighbourhood || a.hamlet || a.suburb || null,
      sucos: posto ? posto.sucos : [],
    };
  } catch {
    // Sem rede, devolve vazio e o formulário deixa escolher tudo à mão. Um
    // passageiro numa zona sem cobertura não pode ficar sem poder corrigir.
    return {};
  }
}
