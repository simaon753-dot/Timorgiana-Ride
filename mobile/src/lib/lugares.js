import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client.js';

// Lugares guardados e destinos recentes.
//
// Em Díli a rede é lenta e os dados custam. Escrever um destino obriga a
// esperar pelo Nominatim e a escolher de uma lista; um toque num lugar
// já conhecido não pede nada a ninguém.
//
// E as pessoas repetem-se: casa, trabalho, o mercado, a escola. É a
// mudança que mais tempo poupa a quem usa a aplicação todos os dias.

const CHAVE = 'tgr.lugares';

// CASA e TRABALHO ficam no TELEMÓVEL, não no servidor.
//
// Não é preguiça de fazer a rota: uma morada de casa marcada como tal é
// mais sensível do que a mesma morada perdida no meio do histórico. Aqui
// não sai do aparelho, não passa por servidor nenhum e não entra em
// cópia de segurança nossa. O preço é perder-se ao reinstalar — e para
// dois endereços que se voltam a definir num toque, é um preço justo.
export const FIXOS = [
  { id: 'casa', icone: '🏠', chave: 'lugarCasa' },
  { id: 'trabalho', icone: '💼', chave: 'lugarTrabalho' },
];

export async function lerFixos() {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE);
    return bruto ? JSON.parse(bruto) : {};
  } catch {
    return {};
  }
}

export async function guardarFixo(id, lugar) {
  const todos = await lerFixos();
  // `lugar` a null apaga — é assim que se desmarca um sítio sem precisar
  // de uma segunda função só para isso.
  if (lugar) todos[id] = { lat: lugar.lat, lng: lugar.lng, label: lugar.label };
  else delete todos[id];
  await AsyncStorage.setItem(CHAVE, JSON.stringify(todos));
  return todos;
}

// Destinos recentes, tirados das viagens já feitas.
//
// Sem coordenadas não serve: um nome sozinho obrigaria a pesquisar outra
// vez, que é exactamente o que isto existe para evitar.
// RECENTES ESCONDIDOS, e porque é esconder e não apagar.
//
// Os recentes NÃO SÃO UMA LISTA GUARDADA: são calculados do histórico de
// viagens, de cada vez que o ecrã abre. Não há nada para apagar — a viagem
// aconteceu, e o histórico é registo do serviço, não uma lista de sugestões
// que se possa limpar.
//
// Por isso guarda-se aqui, no telemóvel, quais os destinos que esta pessoa
// não quer voltar a ver sugeridos. A viagem fica onde estava; o que sai é a
// sugestão. E fica no aparelho pela mesma razão que a casa e o trabalho: uma
// lista de sítios que alguém preferiu esconder diz mais do que parece.
const CHAVE_ESCONDIDOS = 'tgr.recentesEscondidos';

// A MESMA CHAVE que agrupa os recentes, para os dois concordarem. Se o
// esconder usasse outra forma de identificar o sítio, esconder-se-ia um
// destino e continuaria a aparecer outro igual com outra coordenada.
export function chaveDoRecente(label) {
  return String(label || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
}

export async function recentesEscondidos() {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_ESCONDIDOS);
    return new Set(bruto ? JSON.parse(bruto) : []);
  } catch {
    return new Set();
  }
}

export async function esconderRecente(label) {
  const chave = chaveDoRecente(label);
  if (!chave) return;
  const escondidos = await recentesEscondidos();
  escondidos.add(chave);
  try {
    await AsyncStorage.setItem(CHAVE_ESCONDIDOS, JSON.stringify([...escondidos]));
  } catch {
    /* sem espaço ou sem permissão: a sugestão volta a aparecer, e mais nada */
  }
}

export async function destinosRecentes(token, quantos = 3) {
  try {
    const r = await api.rideHistory(token);
    const vistos = new Set();
    const escondidos = await recentesEscondidos();
    const saida = [];
    for (const v of r.rides || []) {
      if (v.destLat == null || v.destLng == null || !v.destLabel) continue;
      // Duas viagens ao mesmo sítio raramente têm coordenadas idênticas;
      // agrupar pelo nome curto evita a mesma rua três vezes na lista.
      const chave = chaveDoRecente(v.destLabel);
      if (!chave || vistos.has(chave) || escondidos.has(chave)) continue;
      vistos.add(chave);
      saida.push({ lat: v.destLat, lng: v.destLng, label: v.destLabel });
      if (saida.length >= quantos) break;
    }
    return saida;
  } catch {
    return []; // sem rede, o ecrã fica só com o "para onde vai?"
  }
}
