"""AS ETIQUETAS DA ESTRADA COMO IMAGENS (27/09/2026).

ENTRADA  src/i18n/{pt,tet,en}.js — os textos mapaLocalRecolha / Destino / Paragem
SAÍDA    assets/etiquetas/etiqueta-<qual>-<língua>.png (+ @2x, @3x)
         assets/etiquetas/manifesto.json — o texto, as medidas e a âncora de cada uma

    python3 scripts/desenhar-etiquetas.py

PORQUE É QUE ISTO EXISTE. O Simão mandou um vídeo do Grab em que a etiqueta
«Drop-off point» fica presa ao ponto da estrada e anda com o mapa DURANTE o
arrasto. A nossa não podia: era uma vista por cima do mapa, posicionada por uma
pergunta assíncrona ao mapa nativo, e a acompanhar o gesto ficaria sempre uns
fotogramas atrasada. Escondia-se durante o gesto e voltava no fim.

Para andar com o mapa no mesmo fotograma, tem de ser o PRÓPRIO mapa a
desenhá-la — um marcador. E no Android do Simão um marcador com texto lá dentro
não aparece de todo; só com imagem. É por isso que os pinos são imagens.

A etiqueta da estrada pode ser uma imagem porque o texto dela é sempre um de
três, em três línguas: nove ficheiros, conhecidos de antemão. O desenho é o
mesmo da vista que substitui (`RotuloLocal` no MapaGoogle): pastilha de pontas
redondas, texto branco, um pé fino e uma bola por baixo — a bola em cima do
sítio.

SE O TEXTO MUDAR NA TRADUÇÃO, É PRECISO CORRER ISTO OUTRA VEZ. O tétum ainda
está por rever. O `npm run verificar` compara o manifesto com as traduções e
recusa publicar enquanto não baterem certo — uma imagem com um texto antigo
não se vê no código, só no mapa.
"""
import json
import os
import re

from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, '..')
SAIDA = os.path.join(RAIZ, 'assets', 'etiquetas')
FONTE = os.path.join(
    RAIZ,
    'node_modules/@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf',
)

LINGUAS = ('pt', 'tet', 'en')
# qual -> (chave da tradução, cor). Destino é coral; o resto é teal — a mesma
# regra da `RotuloLocal`, por inclusão.
QUAIS = {
    'origem': ('mapaLocalRecolha', (0x00, 0x7E, 0x78)),
    'destino': ('mapaLocalDestino', (0xFC, 0x54, 0x30)),
    'paragem': ('mapaLocalParagem', (0x00, 0x7E, 0x78)),
}

# As medidas da `RotuloLocal`, em pontos.
LETRA = 13.5
ENTRELINHA = 19
PAD_H = 10
PAD_V = 5
LARGURA_MAX = 150
PE_L, PE_A = 3, 10
PONTO = 11

# Desenha-se quatro vezes maior e reduz-se no fim: o PIL não suaviza as
# bordas das formas, e uma pastilha de pontas redondas sem suavizar tem
# escadinhas que se vêem a olho nu num ecrã de telemóvel.
SUPER = 4


def textos(lingua):
    caminho = os.path.join(RAIZ, 'src', 'i18n', f'{lingua}.js')
    fonte = open(caminho, encoding='utf-8').read()
    saida = {}
    for qual, (chave, _) in QUAIS.items():
        m = re.search(rf"^\s*{chave}:\s*'((?:[^'\\]|\\.)*)'", fonte, re.M)
        if not m:
            raise SystemExit(f'falta a chave {chave} em {caminho}')
        saida[qual] = m.group(1).replace("\\'", "'")
    return saida


def partir(texto, fonte, largura):
    """No máximo duas linhas, como a `numberOfLines={2}` da vista."""
    palavras = texto.split()
    linhas, actual = [], ''
    for p in palavras:
        tentativa = (actual + ' ' + p).strip()
        if fonte.getlength(tentativa) <= largura or not actual:
            actual = tentativa
        else:
            linhas.append(actual)
            actual = p
    linhas.append(actual)
    return linhas[:2]


def desenhar(texto, cor, escala):
    s = escala * SUPER
    fonte = ImageFont.truetype(FONTE, round(LETRA * s))
    linhas = partir(texto, fonte, (LARGURA_MAX - 2 * PAD_H) * s)
    largura_texto = max(fonte.getlength(l) for l in linhas)
    pl = round(largura_texto + 2 * PAD_H * s)
    ph = round(len(linhas) * ENTRELINHA * s + 2 * PAD_V * s)
    largura = max(pl, round(PONTO * s))
    altura = ph + round(PE_A * s) + round(PONTO * s)

    im = Image.new('RGBA', (largura, altura), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x0 = (largura - pl) // 2
    d.rounded_rectangle([x0, 0, x0 + pl - 1, ph - 1], radius=ph // 2, fill=cor + (255,))
    for i, l in enumerate(linhas):
        w = fonte.getlength(l)
        y = PAD_V * s + i * ENTRELINHA * s + (ENTRELINHA * s - LETRA * s * 1.28) / 2
        d.text(((largura - w) / 2, y), l, font=fonte, fill=(255, 255, 255, 255))
    pe = round(PE_L * s)
    cx = largura / 2
    d.rectangle([cx - pe / 2, ph, cx + pe / 2, ph + round(PE_A * s)], fill=cor + (255,))
    r = round(PONTO * s) / 2
    yc = altura - r
    d.ellipse([cx - r, yc - r, cx + r, yc + r], fill=cor + (255,))

    final = im.resize((round(largura / SUPER), round(altura / SUPER)), Image.LANCZOS)
    return final, largura / s, altura / s


def main():
    if not os.path.exists(FONTE):
        raise SystemExit(f'falta a fonte: {FONTE} (npm install)')
    os.makedirs(SAIDA, exist_ok=True)
    manifesto = {}
    for lingua in LINGUAS:
        manifesto[lingua] = {}
        for qual, texto in textos(lingua).items():
            cor = QUAIS[qual][1]
            for escala, sufixo in ((1, ''), (2, '@2x'), (3, '@3x')):
                im, l, a = desenhar(texto, cor, escala)
                im.save(os.path.join(SAIDA, f'etiqueta-{qual}-{lingua}{sufixo}.png'))
            # A ÂNCORA É O CENTRO DA BOLA: é aí que o mapa assenta o marcador,
            # e é aí que fica o ponto da estrada.
            manifesto[lingua][qual] = {
                'texto': texto,
                'largura': round(l, 2),
                'altura': round(a, 2),
                'ancoraY': round((a - PONTO / 2) / a, 4),
            }
            print(f'{qual:8} {lingua:3}  {l:5.1f} x {a:4.1f} pt  «{texto}»')
    with open(os.path.join(SAIDA, 'manifesto.json'), 'w', encoding='utf-8') as f:
        json.dump(manifesto, f, ensure_ascii=False, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
