#!/usr/bin/env python3
"""Desenha os pinos do mapa como imagens, a partir do mesmo caminho SVG.

PORQUE EXISTE. Dentro de um marcador do react-native-maps, o mapa nativo não
mostra a vista React: tira-lhe uma fotografia e desenha a fotografia. No
telemóvel do Simão essa fotografia saía mal — o pino esmagado — e três
correcções à vista (tamanho declarado, collapsable, momento da fotografia)
não chegaram. Uma imagem não passa por fotografia nenhuma.

O CAMINHO É O MESMO do OSMMap.js e do MapaGoogle.js. Se a forma do pino
mudar, mudar nos três e correr este script — senão o mapa fica com o desenho
velho e o resto da app com o novo.

Correr:  python3 scripts/desenhar-pinos.py
Precisa: Pillow  (pip3 install Pillow)
Escreve: assets/mapa/pino-{origem,destino}{,@2x,@3x}.png
"""

import math
import os
from PIL import Image, ImageDraw

# M2 18 A16 16 0 1 1 34 18  — meia circunferência de cima (a cabeça)
# C34 26 26 32 18 41        — a curva da direita até à ponta
# C10 32 2 26 2 18          — a curva da esquerda de volta
#
# O desenho vive numa caixa de 36x54 e é mostrado a 30x45. O ponto que marca
# o sítio está em y=50 — é essa a âncora do marcador, não a ponta da gota.
CAIXA = (36, 54)
TAMANHO = (30, 45)

# Supermostragem: desenha-se muito maior e reduz-se no fim. É o que dá o
# contorno suave sem depender de uma biblioteca de desenho vectorial.
S = 30

COR = {
    'origem': ('#0E5C54', '#08403A'),
    'destino': ('#E85531', '#8C2E14'),
}


def caminho():
    """Os pontos da gota, em unidades da caixa de 36x54."""
    p = []
    # A cabeça: centro (18,18), raio 16, de 180 a 360 graus.
    for i in range(181):
        a = math.radians(180 + i)
        p.append((18 + 16 * math.cos(a), 18 + 16 * math.sin(a)))

    def bezier(p0, p1, p2, p3, n=90):
        for i in range(1, n + 1):
            t = i / n
            u = 1 - t
            yield (
                u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
            )

    p += list(bezier((34, 18), (34, 26), (26, 32), (18, 41)))
    p += list(bezier((18, 41), (10, 32), (2, 26), (2, 18)))
    return p


def desenhar(fill, risco):
    img = Image.new('RGBA', (CAIXA[0] * S, CAIXA[1] * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = [(x * S, y * S) for x, y in caminho()]
    fechado = pts + [pts[0]]

    # A ordem importa e é a mesma do SVG:
    # 1. o halo branco por fora, traço largo centrado no caminho;
    # 2. o corpo, que tapa a metade de dentro do halo;
    # 3. o contorno escuro, mais estreito, por cima da borda do corpo.
    #
    # O halo custa dois pixéis e é o que faz o pino ler-se sobre um telhado
    # escuro do mapa. Fica um pouco cortado no bordo — o caminho começa em
    # x=2 e o halo pede 2.8 — exactamente como já ficava no Leaflet.
    d.line(fechado, fill='#FFFFFF', width=int(5.6 * S), joint='curve')
    d.polygon(pts, fill=fill)
    d.line(fechado, fill=risco, width=int(2.6 * S), joint='curve')

    # O furo branco: é ele que dá a forma quando a cor se confunde com o
    # que está por baixo.
    d.ellipse([(18 - 6) * S, (18 - 6) * S, (18 + 6) * S, (18 + 6) * S], fill='#FFFFFF')
    # O ponto por baixo marca o sítio exacto; o pino flutua sobre ele.
    d.ellipse([(18 - 2.4) * S, (50 - 2.4) * S, (18 + 2.4) * S, (50 + 2.4) * S], fill='#FFFFFF')
    d.ellipse([(18 - 1.7) * S, (50 - 1.7) * S, (18 + 1.7) * S, (50 + 1.7) * S], fill=risco)
    return img


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    pasta = os.path.join(aqui, '..', 'assets', 'mapa')
    os.makedirs(pasta, exist_ok=True)

    for nome, (fill, risco) in COR.items():
        img = desenhar(fill, risco)
        for sufixo, escala in (('', 1), ('@2x', 2), ('@3x', 3)):
            alvo = img.resize((TAMANHO[0] * escala, TAMANHO[1] * escala), Image.LANCZOS)
            caminho_ficheiro = os.path.join(pasta, f'pino-{nome}{sufixo}.png')
            alvo.save(caminho_ficheiro)
            print('escrito', os.path.relpath(caminho_ficheiro, aqui))


if __name__ == '__main__':
    main()
