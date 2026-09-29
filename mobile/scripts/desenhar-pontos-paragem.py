#!/usr/bin/env python3
"""O ponto discreto das PARAGENS ALTERNATIVAS (29/09/2026).

PORQUE EXISTE. As paragens alternativas — as que o Simão define no painel e
que não estão escolhidas — eram sempre o pino pequeno (26x33). Ele pediu que
fiquem no mapa com o menor tamanho possível, discretas, e que só fiquem mais
visíveis quando a pessoa se aproxima ou encosta a mira. Discreto é este
ponto; destacado é o pino pequeno de sempre (ver `MapaGoogle.js`).

A COR VEM DOS PRÓPRIOS PINOS, medida aqui e não escrita à mão: o ponto e o
pino são o mesmo sítio em dois tamanhos, e têm de ser da mesma cor ao pixel.
Se os pinos forem repintados, correr isto outra vez.

A CAIXA É MAIOR DO QUE O PONTO, e o resto é transparente — a mesma razão do
`ponto-outro` do desenhar-pinos.py: a área de toque de um marcador é a da
imagem, e um dedo cobre uns 40 pixéis. O ponto vê-se a 12; toca-se a 34.

NÃO CORRER o desenhar-pinos.py para isto: esse reescreve também os pinos
grandes, que entretanto foram repintados pelo recortar-novos-icones.py.

Correr:  python3 scripts/desenhar-pontos-paragem.py
Precisa: Pillow  (pip3 install Pillow)
Escreve: assets/mapa/ponto-paragem-{origem,destino}{,@2x,@3x}.png
"""

import os
from collections import Counter
from PIL import Image, ImageDraw

CAIXA = 34     # pontos: a área de toque
BRANCO = 12    # pontos: o anel branco, que é o tamanho que se vê
COR = 8.5      # pontos: o miolo com a cor do pino
S = 30         # supermostragem, para a borda sair lisa


def cor_do_pino(caminho):
    """A cor do CORPO do pino: a mais frequente entre os pixéis opacos que
    não são o branco do furo e do halo."""
    im = Image.open(caminho).convert('RGBA')
    c = Counter(p[:3] for p in im.getdata() if p[3] == 255 and min(p[:3]) < 235)
    return c.most_common(1)[0][0]


def desenhar(cor):
    lado = CAIXA * S
    img = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = lado / 2
    # O anel branco é o que o separa do mapa por baixo — de um telhado escuro,
    # de um rio, de uma avenida da mesma cor.
    r = BRANCO * S / 2
    d.ellipse([c - r, c - r, c + r, c + r], fill='#FFFFFF')
    r = COR * S / 2
    d.ellipse([c - r, c - r, c + r, c + r], fill=cor)
    return img


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    pasta = os.path.join(aqui, '..', 'assets', 'mapa')
    for qual in ('origem', 'destino'):
        cor = cor_do_pino(os.path.join(pasta, f'pino-{qual}-pequeno@3x.png'))
        img = desenhar(cor)
        for sufixo, escala in (('', 1), ('@2x', 2), ('@3x', 3)):
            alvo = img.resize((CAIXA * escala, CAIXA * escala), Image.LANCZOS)
            ficheiro = os.path.join(pasta, f'ponto-paragem-{qual}{sufixo}.png')
            alvo.save(ficheiro)
            print('escrito', os.path.relpath(ficheiro, aqui), '#%02X%02X%02X' % cor)


if __name__ == '__main__':
    main()
