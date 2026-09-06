import AsyncStorage from '@react-native-async-storage/async-storage';

// Os sítios que esta pessoa já escolheu na pesquisa.
//
// Serve uma coisa só: não voltar a escrever o que já se escreveu. Em Díli
// quase toda a gente vai aos mesmos cinco ou seis sítios, e escrever
// "Terminal Becora" letra a letra numa rede lenta, todos os dias, é fazer a
// pessoa trabalhar por uma coisa que já lhe dissemos.
//
// GUARDA-SE POR CONTA E NÃO POR TELEMÓVEL. Em Díli os telemóveis
// partilham-se — entre irmãos, entre marido e mulher, entre colegas. Uma
// lista de destinos diz onde a pessoa anda, e não deve aparecer a quem entrar
// a seguir com outra conta.
//
// GUARDA-SE O LUGAR INTEIRO e não o texto que foi escrito. Assim tocar num
// recente é imediato: já tem as coordenadas, não precisa de ir perguntar
// nada a ninguém. Numa rede como a de Díli isso é a diferença entre um toque
// e cinco segundos de espera.
const QUANTOS = 6;

function chave(userId) {
  return `recentes:${userId ?? 'anonimo'}`;
}

export async function lerRecentes(userId) {
  try {
    const cru = await AsyncStorage.getItem(chave(userId));
    const lista = cru ? JSON.parse(cru) : [];
    return Array.isArray(lista) ? lista.slice(0, QUANTOS) : [];
  } catch {
    // Uma lista de conveniência não vale um erro na cara de ninguém.
    return [];
  }
}

// Apagar UM recente.
//
// Faltava, e sem isto a lista era só de leitura: um sítio a que se foi uma
// vez por engano ficava lá para sempre, a ocupar um dos quatro lugares que
// cabem no ecrã. Uma lista de conveniência que não se pode limpar deixa de
// ser conveniente ao fim de umas semanas.
export async function apagarRecente(userId, lugar) {
  if (!lugar) return [];
  try {
    const antes = await lerRecentes(userId);
    const lista = antes.filter(
      (x) => Math.abs(x.lat - lugar.lat) > 0.0001 || Math.abs(x.lng - lugar.lng) > 0.0001
    );
    await AsyncStorage.setItem(chave(userId), JSON.stringify(lista));
    return lista;
  } catch {
    return [];
  }
}

export async function guardarRecente(userId, lugar) {
  if (!lugar || typeof lugar.lat !== 'number' || typeof lugar.lng !== 'number') return;
  try {
    const antes = await lerRecentes(userId);
    // COMPARA-SE PELA COORDENADA e não pelo nome.
    //
    // O mesmo portão volta com nomes diferentes conforme quem o devolveu —
    // "Timor Plaza", "Timor Plaza Shopping", "Rua Presidente Nicolau
    // Lobato". Comparar textos enchia a lista de repetições do mesmo sítio.
    // Quatro casas decimais são cerca de onze metros.
    const mesmo = (a, b) => Math.abs(a.lat - b.lat) < 0.0001 && Math.abs(a.lng - b.lng) < 0.0001;
    const novo = {
      lat: lugar.lat,
      lng: lugar.lng,
      label: lugar.label,
      detalhe: lugar.detalhe || null,
      fonte: lugar.fonte || null,
    };
    const lista = [novo, ...antes.filter((x) => !mesmo(x, novo))].slice(0, QUANTOS);
    await AsyncStorage.setItem(chave(userId), JSON.stringify(lista));
  } catch {
    /* sem espaço ou sem permissão: perde-se a conveniência, mais nada */
  }
}
