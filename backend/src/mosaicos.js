import { open } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PMTiles } from 'pmtiles';

// Servir os mosaicos do mapa próprio, um a um.
//
// PORQUE EXISTE, e é um erro meu corrigido. O ficheiro .pmtiles é servido
// inteiro noutra rota, e no browser isso chega: o MapLibre de JavaScript sabe
// ler `pmtiles://` porque se lhe acrescenta um pedaço de código.
//
// O MAPLIBRE NATIVO DO TELEMÓVEL NÃO SABE. Vê um endereço que não entende e
// não desenha nada. Eu testei o mapa no browser, onde funciona, e não na app,
// onde não podia funcionar — e o Simão instalou um APK para descobrir isso.
//
// Aqui o servidor lê o mosaico de dentro do ficheiro e devolve-o num endereço
// que qualquer motor de mapas entende: /mapa/{z}/{x}/{y}.mvt
//
// UM SÓ LEITOR PARA TODA A VIDA DO PROCESSO. O PMTiles guarda o índice em
// memória depois da primeira leitura; abrir um leitor por pedido deitava esse
// índice fora a cada mosaico e lia o cabeçalho do ficheiro dezenas de vezes
// por ecrã.
class FicheiroLocal {
  constructor(caminho) {
    this.caminho = caminho;
  }

  getKey() {
    return this.caminho;
  }

  async getBytes(posicao, tamanho) {
    const f = await open(this.caminho, 'r');
    try {
      const buf = Buffer.alloc(tamanho);
      await f.read(buf, 0, tamanho, posicao);
      return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
    } finally {
      await f.close();
    }
  }
}

let leitor = null;

function obter() {
  if (!leitor) {
    const caminho = fileURLToPath(new URL('../publico/timor-leste.pmtiles', import.meta.url));
    leitor = new PMTiles(new FicheiroLocal(caminho));
  }
  return leitor;
}

export async function mosaico(z, x, y) {
  const t = await obter().getZxy(z, x, y);
  return t?.data ? Buffer.from(t.data) : null;
}
