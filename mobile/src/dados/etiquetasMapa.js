// AS ETIQUETAS DA ESTRADA, COMO IMAGENS PARA O MAPA DESENHAR (27/09/2026).
//
// Geradas por `scripts/desenhar-etiquetas.py` a partir das traduções — ver lá
// o porquê. Aqui só se entregam: o `require` tem de ser escrito à letra, um
// por ficheiro, porque o empacotador só leva para a app as imagens que
// consegue ver no código. Uma lista montada em tempo de execução deixava-as
// todas de fora, sem erro nenhum.
//
// O `npm run verificar` confirma que cada uma destas existe e que o texto
// desenhado nela é o da tradução actual.
// `require` e não `import`, como as imagens: é assim que o empacotador lê um
// JSON, e o verificador de importações só conhece módulos de código.
const manifesto = require('../../assets/etiquetas/manifesto.json');

const IMAGENS = {
  pt: {
    origem: require('../../assets/etiquetas/etiqueta-origem-pt.png'),
    destino: require('../../assets/etiquetas/etiqueta-destino-pt.png'),
    paragem: require('../../assets/etiquetas/etiqueta-paragem-pt.png'),
  },
  tet: {
    origem: require('../../assets/etiquetas/etiqueta-origem-tet.png'),
    destino: require('../../assets/etiquetas/etiqueta-destino-tet.png'),
    paragem: require('../../assets/etiquetas/etiqueta-paragem-tet.png'),
  },
  en: {
    origem: require('../../assets/etiquetas/etiqueta-origem-en.png'),
    destino: require('../../assets/etiquetas/etiqueta-destino-en.png'),
    paragem: require('../../assets/etiquetas/etiqueta-paragem-en.png'),
  },
};

// A imagem, as medidas em pontos e a âncora (o centro da bola) de uma
// etiqueta. Uma língua desconhecida cai no português, e um tipo desconhecido
// na recolha — nunca em nada, que era uma etiqueta que desaparece sem aviso.
export function etiquetaDoMapa(qual, lingua) {
  const l = IMAGENS[lingua] ? lingua : 'pt';
  const q = IMAGENS[l][qual] ? qual : 'origem';
  return { imagem: IMAGENS[l][q], ...manifesto[l][q] };
}
