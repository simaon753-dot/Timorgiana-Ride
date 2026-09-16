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

# AS CORES DOS PINOS NOVOS (16/09/2026), medidas dos ficheiros que o Simão
# desenhou (desenho/imagens/novo pino {teal,coral}.jpeg): mais vivas do que as
# da paleta, e sem o contorno escuro que a versão anterior tinha. Os pinos
# passam a ser lisos, como no desenho dele, e o furo branco é maior.
COR = {
    'origem': '#006870',
    'destino': '#F85038',
    # A PARAGEM É CORAL MAIS CLARO, e não uma terceira cor.
    #
    # A paleta é teal e coral, por decisao do Simao, e inventar um terceiro
    # tom para isto seria contraria-la. Um coral claro diz o que e preciso
    # dizer: isto e uma entrega — mas nao a ultima. O escuro do contorno
    # mantem-se proximo do destino final, para as duas se lerem como familia.
    'paragem': '#FF8064',
}

# O FURO BRANCO, em unidades da caixa: 7,8 de um raio de cabeça de 16 — quase
# metade, como nos ficheiros novos. Antes eram 6. É o furo que dá a forma
# quando a cor do pino se encontra com uma parecida no mapa.
FURO = 7.8


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


# A OUTRA PARAGEM: onde o carro TAMBÉM pode parar.
#
# Quando o Simão define duas paragens a cobrir o mesmo sítio, a app deixou de
# escolher uma em silêncio e mostra as duas. Esta é a que não está posta.
#
# CINZENTA, e não com a cor da marca. É o mesmo desenho da paragem activa —
# tem de se ler como sendo a mesma espécie de coisa — mas apagada, porque a
# diferença que interessa é qual das duas está escolhida. Duas iguais no mapa
# não são uma escolha, são uma dúvida.
#
# A CAIXA É MAIOR DO QUE O CÍRCULO, e o resto é transparente. Um marcador de
# 16 pixéis desenha-se bem e toca-se mal: o dedo de um adulto cobre uns 40, e
# quem falha o toque conclui que não é para tocar. A área de toque de um
# marcador é a da imagem, por isso a margem invisível é o que o torna
# alcançável sem o tornar maior aos olhos.
PONTO_OUTRO = 34  # caixa; o círculo continua a ler-se a 16


def desenhar_ponto_alternativo():
    lado = PONTO_OUTRO * S
    img = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    circulo = desenhar_ponto(anel='#8A9591')
    canto = (lado - circulo.width) // 2
    img.paste(circulo, (canto, canto), circulo)
    return img


def desenhar(fill):
    img = Image.new('RGBA', (CAIXA[0] * S, CAIXA[1] * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = [(x * S, y * S) for x, y in caminho()]
    fechado = pts + [pts[0]]

    # A ordem importa e é a mesma do SVG:
    # 1. o halo branco por fora, traço fino centrado no caminho;
    # 2. o corpo, liso, que tapa a metade de dentro do halo.
    #
    # O CONTORNO ESCURO SAIU (16/09/2026): os pinos que o Simão desenhou são
    # de uma cor só. O halo branco fica, mais fino do que era: não está no
    # desenho dele porque ali o fundo é branco, mas no mapa é o que impede um
    # pino de desaparecer sobre um telhado escuro.
    d.line(fechado, fill='#FFFFFF', width=int(2.4 * S), joint='curve')
    d.polygon(pts, fill=fill)

    # O furo branco: é ele que dá a forma quando a cor se confunde com o
    # que está por baixo.
    d.ellipse([(18 - FURO) * S, (18 - FURO) * S, (18 + FURO) * S, (18 + FURO) * S], fill='#FFFFFF')
    # O ponto por baixo marca o sítio exacto; o pino flutua sobre ele. O miolo
    # leva a cor do pino, que era a do contorno quando ele existia.
    d.ellipse([(18 - 2.4) * S, (50 - 2.4) * S, (18 + 2.4) * S, (50 + 2.4) * S], fill='#FFFFFF')
    d.ellipse([(18 - 1.7) * S, (50 - 1.7) * S, (18 + 1.7) * S, (50 + 1.7) * S], fill=fill)
    return img


# ── O carro saiu daqui a 17/09/2026 ─────────────────────────────────────
#
# Passou a um distintivo por tipo de veículo (motorizada, carro, pickup),
# recortado dos desenhos do Simão por scripts/recortar-veiculos.py.


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    pasta = os.path.join(aqui, '..', 'assets', 'mapa')
    os.makedirs(pasta, exist_ok=True)

    for nome, fill in COR.items():
        img = desenhar(fill)
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

    outro = desenhar_ponto_alternativo()
    for sufixo, escala in (('', 1), ('@2x', 2), ('@3x', 3)):
        alvo = outro.resize((PONTO_OUTRO * escala, PONTO_OUTRO * escala), Image.LANCZOS)
        caminho_ficheiro = os.path.join(pasta, f'ponto-outro{sufixo}.png')
        alvo.save(caminho_ficheiro)
        print('escrito', os.path.relpath(caminho_ficheiro, aqui))



if __name__ == '__main__':
    main()
