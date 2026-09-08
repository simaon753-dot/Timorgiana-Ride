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


# O PONTO NA ESTRADA: onde o carro encosta.
#
# É imagem e não uma vista por cima do mapa, e a razão é a mesma dos pinos —
# só que descoberta ao contrário. Uma vista desenhada em pixéis por cima do
# mapa tem de ser recolocada de cada vez que o mapa se mexe, e recolocar
# depois do movimento significa vê-la a flutuar durante ele. O Simão viu, e
# tinha razão: um ponto que marca um sítio não pode andar quando o mapa anda.
#
# Um marcador com imagem é desenhado PELO mapa, agarrado à coordenada. Nunca
# se descola, e não passa pela fotografia que estraga os marcadores com
# filhos.
PONTO = 16  # mostrado a 16x16


def desenhar_ponto(anel='#3F4A46'):
    """Círculo branco com anel escuro — o fim da linha, como no Google Maps.

    O Simão comparou a nossa versão com a do Google e preferiu a do Google:
    sem balão, sem rótulo, só o círculo na estrada e os pontinhos até ao pino.
    Tem razão — o rótulo dizia por palavras o que o desenho já diz, e obrigava
    a uma sobreposição em pixéis que nunca ficava agarrada ao mapa.

    Branco por dentro e escuro à volta, e não o contrário: assim lê-se sobre
    o cinzento de uma avenida e sobre o creme de um quarteirão sem se perder
    em nenhum dos dois.
    """
    lado = PONTO * S
    img = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, lado - 1, lado - 1], fill=anel)
    m = int(2.6 * S)
    d.ellipse([m, m, lado - 1 - m, lado - 1 - m], fill='#FFFFFF')
    return img


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


# ── O carro ────────────────────────────────────────────────────────────
#
# Era um emoji dentro de um marcador, e por isso desenhado POR CIMA do mapa
# quando os marcadores com filhos se revelaram inúteis. Mas por cima do mapa
# a posição só se recalcula quando o mapa pára: ao arrastar, o carro ficava
# colado ao ecrã e parecia andar sozinho. O Simão viu-o de imediato.
#
# Como imagem volta a ser um marcador de verdade, e um marcador anda com o
# mapa sem ninguém ter de calcular nada.
#
# Um distintivo escuro com a silhueta branca: escuro para se distinguir dos
# dois pinos, que são os pontos parados, e redondo porque não marca um sítio
# — marca quem está a mexer-se.
CARRO = 40
FUNDO = '#14201D'
REALCE = '#FF6B4A'


def desenhar_carro():
    img = Image.new('RGBA', (CARRO * S, CARRO * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    m = 2 * S  # margem para a sombra branca não encostar ao bordo
    # O anel branco por fora, pela mesma razão do halo dos pinos: sobre um
    # telhado escuro, um distintivo escuro desaparece.
    d.ellipse([m - 1.6 * S, m - 1.6 * S, CARRO * S - m + 1.6 * S, CARRO * S - m + 1.6 * S],
              fill='#FFFFFF')
    d.ellipse([m, m, CARRO * S - m, CARRO * S - m], fill=FUNDO, outline=REALCE, width=int(1.2 * S))

    # A silhueta, de lado, como o emoji que substitui.
    def r(x0, y0, x1, y1, raio, cor):
        d.rounded_rectangle([x0 * S, y0 * S, x1 * S, y1 * S], radius=raio * S, fill=cor)

    r(10.5, 20.5, 29.5, 26, 1.6, '#FFFFFF')   # corpo
    r(14, 14.5, 26, 21, 2.2, '#FFFFFF')       # tejadilho
    r(15.4, 16, 24.6, 20.4, 1.2, FUNDO)       # vidros
    for cx in (15.5, 24.5):                    # rodas
        d.ellipse([(cx - 2.6) * S, (26 - 2.6) * S, (cx + 2.6) * S, (26 + 2.6) * S], fill='#FFFFFF')
        d.ellipse([(cx - 1.2) * S, (26 - 1.2) * S, (cx + 1.2) * S, (26 + 1.2) * S], fill=FUNDO)
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

    ponto = desenhar_ponto()
    for sufixo, escala in (('', 1), ('@2x', 2), ('@3x', 3)):
        alvo = ponto.resize((PONTO * escala, PONTO * escala), Image.LANCZOS)
        caminho_ficheiro = os.path.join(pasta, f'ponto-estrada{sufixo}.png')
        alvo.save(caminho_ficheiro)
        print('escrito', os.path.relpath(caminho_ficheiro, aqui))

    carro = desenhar_carro()
    for sufixo, escala in (('', 1), ('@2x', 2), ('@3x', 3)):
        alvo = carro.resize((CARRO * escala, CARRO * escala), Image.LANCZOS)
        caminho_ficheiro = os.path.join(pasta, f'carro{sufixo}.png')
        alvo.save(caminho_ficheiro)
        print('escrito', os.path.relpath(caminho_ficheiro, aqui))


if __name__ == '__main__':
    main()
