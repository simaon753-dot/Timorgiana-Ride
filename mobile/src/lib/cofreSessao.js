// O COFRE DA SESSÃO: onde fica a senha temporária que prova quem entrou.
//
// PORQUE EXISTE. O token de sessão é o acesso à conta — quem o tiver entra
// como aquela pessoa e vê tudo o que ela vê, sem precisar da palavra-passe.
// Estava no AsyncStorage, que é a gaveta comum do Android: um ficheiro de
// texto dentro da área da app. Com o telemóvel bloqueado ninguém lá chega;
// num telemóvel roubado e desbloqueado, ou com acesso de root — comum em
// aparelhos antigos e baratos —, esse token lê-se e copia-se.
//
// O SecureStore guarda o mesmo token no cofre encriptado do sistema (o
// Keystore do Android), preso ao aparelho por hardware. Copiar o ficheiro
// deixa de chegar: sem a chave do aparelho, o que se copia é ilegível.
//
// TODO O ACESSO AO TOKEN PASSA POR AQUI. Antes estava espalhado por quatro
// sítios do AuthContext; a lógica da ponte (abaixo) só é segura se houver um
// caminho único, e não quatro cópias que divergem.
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// A MESMA CHAVE de sempre, de propósito. A ponte precisa de encontrar na
// gaveta velha exactamente o que lá foi guardado.
const CHAVE = 'tgr.token';

// O SecureStore pode não existir — na web, ou num ambiente sem cofre. A
// resposta é cara (toca no sistema), por isso pergunta-se uma vez e guarda-se.
let cofreOk = null;
async function temCofre() {
  if (cofreOk !== null) return cofreOk;
  try {
    cofreOk = await SecureStore.isAvailableAsync();
  } catch {
    cofreOk = false;
  }
  return cofreOk;
}

export async function guardarToken(token) {
  if (await temCofre()) {
    await SecureStore.setItemAsync(CHAVE, token);
    // Se ainda restar cópia na gaveta velha, apaga. Não deixar o token em
    // texto depois de já estar no cofre — era desfazer a razão de tudo isto.
    await AsyncStorage.removeItem(CHAVE).catch(() => {});
    return;
  }
  // SEM COFRE, a app continua a funcionar com a gaveta de sempre. Uma app que
  // entra é melhor do que uma app que rebenta por não haver cofre — e onde o
  // cofre não existe (a web) também não há o telemóvel perdido que ele
  // protege. A segurança que derruba o serviço não protege ninguém.
  await AsyncStorage.setItem(CHAVE, token);
}

export async function lerToken() {
  if (!(await temCofre())) {
    return AsyncStorage.getItem(CHAVE);
  }
  const doCofre = await SecureStore.getItemAsync(CHAVE);
  if (doCofre) return doCofre;

  // A PONTE, corrida uma vez por aparelho.
  //
  // Primeira abertura com esta versão: o cofre está vazio, mas quem já usava
  // a app tem o token na gaveta velha. Move-se para o cofre e limpa-se a
  // gaveta — a pessoa continua com sessão, sem escrever a palavra-passe, e o
  // token dela deixa de estar em texto. Da segunda vez em diante o cofre já
  // responde e nunca mais se passa por aqui.
  const antigo = await AsyncStorage.getItem(CHAVE).catch(() => null);
  if (antigo) {
    await SecureStore.setItemAsync(CHAVE, antigo);
    await AsyncStorage.removeItem(CHAVE).catch(() => {});
    return antigo;
  }
  return null;
}

export async function apagarToken() {
  // Dos DOIS sítios, sempre. Um logout logo a seguir à migração, ou uma ponte
  // interrompida a meio, podia deixar um resto na gaveta velha — que é
  // precisamente o que não queremos que sobre.
  await SecureStore.deleteItemAsync(CHAVE).catch(() => {});
  await AsyncStorage.removeItem(CHAVE).catch(() => {});
}
