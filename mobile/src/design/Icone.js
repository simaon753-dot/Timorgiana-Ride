import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline, Ellipse } from 'react-native-svg';
import { colors } from '../theme.js';

// ÍCONES DESENHADOS, e não emojis.
//
// PORQUE EXISTE. A app usava emojis onde devia ter ícones — 📍 oito vezes,
// 🚨 seis, 🧍, 💵, 🏠. Um emoji não é um ícone: é desenhado pelo SISTEMA, e
// por isso muda de forma e de cor conforme o telemóvel, ignora a cor da
// marca, e num Android antigo pode nem existir. Lado a lado com texto
// cuidado, denuncia logo que ali ninguém desenhou nada.
//
// Foi a diferença que mais salta à vista entre a app e as maquetas que o
// Simão trouxe: nelas os ícones são traço fino, verdes, todos da mesma
// família. É metade da razão pela qual parecem outra aplicação.
//
// UM SÓ COMPONENTE e não um ficheiro por ícone: assim a espessura do traço,
// a grelha e as pontas arredondadas são decididas UMA vez para todos. Vinte
// ficheiros separados divergem — um com traço 1,5, outro com 2 — e ninguém
// consegue apontar porque é que o ecrã parece desalinhado.
//
// Todos na mesma grelha de 24×24, traço e não preenchimento, pontas e
// cantos redondos. É a família do desenho das maquetas.
const CAIXA = 24;

export default function Icone({ nome, tamanho = 24, cor, traco = 2, preenchido = false }) {
  const c = cor || colors.teal;
  // Propriedades comuns a todos os traços: definidas aqui e não repetidas em
  // cada figura, senão bastaria esquecer uma para aquele ícone ficar de
  // pontas quadradas no meio dos outros.
  const p = {
    stroke: c,
    strokeWidth: traco,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };
  const cheio = { fill: c, stroke: 'none' };

  return (
    <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${CAIXA} ${CAIXA}`}>
      {desenho(nome, p, cheio, preenchido, c)}
    </Svg>
  );
}

function desenho(nome, p, cheio, preenchido, c) {
  switch (nome) {
    // ---- as três caixas de estatística da viagem ----
    case 'relogio':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...p} />
          <Polyline points="12 7 12 12 15.5 14" {...p} />
        </>
      );
    case 'rota':
      // Dois pinos ligados por um caminho aos pontinhos — "depois, a viagem".
      return (
        <>
          <Path
            d="M6 3.5a2.8 2.8 0 0 1 2.8 2.8C8.8 8.3 6 11 6 11S3.2 8.3 3.2 6.3A2.8 2.8 0 0 1 6 3.5z"
            {...p}
          />
          <Path
            d="M18 12.5a2.8 2.8 0 0 1 2.8 2.8c0 2-2.8 4.7-2.8 4.7s-2.8-2.7-2.8-4.7a2.8 2.8 0 0 1 2.8-2.8z"
            {...p}
          />
          <Path d="M8.5 12.5c2 0 3 1.5 3 2.8s-1 2.7-3 2.7" {...p} strokeDasharray="0.6 2.6" />
        </>
      );
    case 'moedas':
      return (
        <>
          <Ellipse cx="12" cy="6.5" rx="7.5" ry="3" {...p} />
          <Path d="M4.5 6.5v4c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-4" {...p} />
          <Path d="M4.5 10.5v4c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-4" {...p} />
        </>
      );

    // ---- acções da viagem ----
    case 'telefone':
      return (
        <Path
          d="M6.2 3.5h3l1.5 3.8-1.9 1.2a11 11 0 0 0 4.7 4.7l1.2-1.9 3.8 1.5v3a1.8 1.8 0 0 1-2 1.8A15.5 15.5 0 0 1 4.4 5.5a1.8 1.8 0 0 1 1.8-2z"
          {...p}
        />
      );
    case 'mensagem':
      return (
        <>
          <Path
            d="M20 12.5a7.5 7.5 0 0 1-10.8 6.7L4.5 20.5l1.3-4.5A7.5 7.5 0 1 1 20 12.5z"
            {...p}
          />
          <Circle cx="9" cy="12.5" r="1" {...cheio} />
          <Circle cx="12.5" cy="12.5" r="1" {...cheio} />
          <Circle cx="16" cy="12.5" r="1" {...cheio} />
        </>
      );
    case 'pin':
      return (
        <>
          <Path
            d="M12 21.5s7-6.2 7-11.2a7 7 0 1 0-14 0c0 5 7 11.2 7 11.2z"
            {...(preenchido ? cheio : p)}
          />
          {!preenchido ? <Circle cx="12" cy="10" r="2.6" {...p} /> : null}
        </>
      );
    case 'sirene':
      // Emergência. Traços a sair do topo — a luz a piscar.
      return (
        <>
          {/* Cúpula ESTREITA E ALTA sobre uma base, e não um arco largo.
              O arco largo lia-se como um monte, e os raios por cima faziam
              dele um nascer do sol — a imagem mais distante possível de uma
              emergência. */}
          <Path d="M8 18.5v-2.2a4 4 0 0 1 8 0v2.2" {...p} />
          <Rect x="6" y="18.5" width="12" height="2.6" rx="1.3" {...p} />
          <Line x1="12" y1="5.2" x2="12" y2="7.6" {...p} />
          <Line x1="6.6" y1="7.4" x2="8.3" y2="9.1" {...p} />
          <Line x1="17.4" y1="7.4" x2="15.7" y2="9.1" {...p} />
        </>
      );
    case 'proibido':
      return (
        <>
          <Circle cx="12" cy="12" r="8.5" {...p} />
          <Line x1="6.2" y1="6.2" x2="17.8" y2="17.8" {...p} />
        </>
      );
    case 'partilhar':
      return (
        <>
          <Circle cx="17.5" cy="5.5" r="2.6" {...p} />
          <Circle cx="6.5" cy="12" r="2.6" {...p} />
          <Circle cx="17.5" cy="18.5" r="2.6" {...p} />
          <Line x1="8.8" y1="10.7" x2="15.2" y2="6.8" {...p} />
          <Line x1="8.8" y1="13.3" x2="15.2" y2="17.2" {...p} />
        </>
      );

    // ---- ecrã do motorista ----
    case 'calendario':
      return (
        <>
          <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" {...p} />
          <Line x1="3.5" y1="9.5" x2="20.5" y2="9.5" {...p} />
          <Line x1="8" y1="3" x2="8" y2="6.5" {...p} />
          <Line x1="16" y1="3" x2="16" y2="6.5" {...p} />
        </>
      );
    case 'cadeado':
      return (
        <>
          <Rect x="4.5" y="10.5" width="15" height="10" rx="2.5" {...p} />
          <Path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" {...p} />
        </>
      );
    case 'sino':
      return (
        <>
          <Path d="M18 16.5H6l1.2-2v-4a4.8 4.8 0 0 1 9.6 0v4z" {...p} />
          <Path d="M10.2 19.5a2 2 0 0 0 3.6 0" {...p} />
        </>
      );
    case 'pessoa':
      return (
        <>
          <Circle cx="12" cy="8.5" r="3.6" {...p} />
          <Path d="M5 20.5a7 7 0 0 1 14 0" {...p} />
        </>
      );
    case 'documento':
      return (
        <>
          <Path
            d="M6 3.5h7l5 5v12a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20.5v-15A1.5 1.5 0 0 1 6.5 3.5z"
            {...p}
          />
          <Polyline points="13 3.5 13 9 18.5 9" {...p} />
          <Line x1="8.5" y1="13" x2="14" y2="13" {...p} />
          <Line x1="8.5" y1="16.5" x2="12" y2="16.5" {...p} />
        </>
      );
    case 'mapa':
      return (
        <>
          <Path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" {...p} />
          <Line x1="9" y1="4.5" x2="9" y2="17.5" {...p} />
          <Line x1="15" y1="6.5" x2="15" y2="19.5" {...p} />
        </>
      );

    // ---- veículos ----
    case 'carro':
      return (
        <>
          <Path
            d="M4 15.5v-2.2l1.8-4.4A2 2 0 0 1 7.7 7.5h8.6a2 2 0 0 1 1.9 1.4l1.8 4.4v2.2"
            {...p}
          />
          <Line x1="4" y1="12.8" x2="20" y2="12.8" {...p} />
          <Circle cx="7.5" cy="15.5" r="1.8" {...p} />
          <Circle cx="16.5" cy="15.5" r="1.8" {...p} />
        </>
      );
    case 'mota':
      return (
        <>
          <Circle cx="5.5" cy="16" r="3.2" {...p} />
          <Circle cx="18.5" cy="16" r="3.2" {...p} />
          <Path d="M5.5 16l3.5-4.5h5l2.5 4.5" {...p} />
          <Path d="M9 11.5l-1.5-3h3" {...p} />
          <Line x1="14" y1="11.5" x2="16.5" y2="8" {...p} />
        </>
      );

    // ---- barra de baixo ----
    case 'casa':
      return (
        <>
          <Path
            d="M4 10.5L12 4l8 6.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"
            {...(preenchido ? cheio : p)}
          />
          {!preenchido ? <Path d="M9.5 20.5v-6h5v6" {...p} /> : null}
        </>
      );
    case 'carteira':
      return (
        <>
          <Rect x="3.5" y="6" width="17" height="13" rx="2.5" {...p} />
          <Path d="M3.5 10h17" {...p} />
          <Circle cx="16.5" cy="14.5" r="1.2" {...cheio} />
        </>
      );

    // ---- utilitários ----
    case 'seta':
      return <Polyline points="9 5 16 12 9 19" {...p} />;
    case 'engrenagem':
      return (
        <>
          {/* Corpo GRANDE com dentes CURTOS colados a ele, e um furo ao
              centro. Antes era um círculo pequeno com oito raios compridos a
              sair de longe — que é o desenho de um sol, não de uma roda. */}
          <Circle cx="12" cy="12" r="7.2" {...p} />
          <Circle cx="12" cy="12" r="2.6" {...p} />
          <Path
            d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M5.4 18.6l1.6-1.6M17 7l1.6-1.6"
            {...p}
          />
        </>
      );
    case 'visto':
      return <Polyline points="5 12.5 10 17.5 19 7" {...p} />;
    default:
      return null;
  }
}
