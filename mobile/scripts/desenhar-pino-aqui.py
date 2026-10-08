#!/usr/bin/env python3
"""O «estás aqui» do motorista (08/10/2026, pedido do Simão).

Era o veículo num disco teal escuro. Passa a ser o PINO DE DESTINO coral, com
o círculo branco um pouco maior e o veículo do motorista lá dentro, no teal
da app — a motorizada para quem conduz motorizada, o carro e a pickup para os
outros.

SÓ NO MAPA DO PRÓPRIO MOTORISTA. O mesmo marcador mostra ao passageiro o
motorista a chegar, e aí fica o disco: um pino a andar parecia um destino.
Ver `vivoComoPino` no MapaGoogle.js.

ENTRADA  o pino de destino em vigor (ver recortar-pinos-novos.py: ORIGEM)
         assets/icones/veiculo-{mota,carro,carry}@3x.png        (silhuetas brancas)
SAÍDA    assets/mapa/aqui-{motorbike,car,carry}{,@2x,@3x}.png   46 × 59, como o pino

O pino aponta pela ponta do ponto de baixo, como o de destino: a âncora é a
mesma (`ANCORA_Y`). O guião escreve-a no fim, para conferir.

Correr:  python3 scripts/desenhar-pino-aqui.py
"""

import importlib.util
import os

from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))


def modulo(nome, ficheiro):
    spec = importlib.util.spec_from_file_location(nome, os.path.join(AQUI, ficheiro))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


icones = modulo('icones', 'recortar-novos-icones.py')
pinos = modulo('pinos', 'recortar-pinos-novos.py')

TEAL = (0x0E, 0x5C, 0x54, 255)
# O círculo branco cresce até esta fracção da largura da cabeça do pino: o
# original (~0,44) deixava a motorizada com 14 dp, um borrão.
CIRCULO = 0.62
# Quanto do diâmetro do círculo o veículo ocupa, na largura.
VEICULO = 0.80
VEICULOS = {'motorbike': 'veiculo-mota', 'car': 'veiculo-carro', 'carry': 'veiculo-carry'}


def pino_com(veiculo):
    # O desenho do pino de destino em vigor (recortar-pinos-novos.py).
    pino = pinos.arte('pino destino.png', False).copy()
    alfa = pino.getchannel('A')
    w, h = pino.size
    # A cabeça do pino: a linha mais larga dá o centro e o raio.
    larguras = []
    for y in range(h):
        xs = [x for x in range(w) if alfa.getpixel((x, y)) > 127]
        larguras.append((xs[-1] - xs[0], y, (xs[0] + xs[-1]) / 2) if xs else (0, y, 0))
    largura, cy, cx = max(larguras)
    r = largura * CIRCULO / 2
    ImageDraw.Draw(pino).ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, 255))

    silhueta = Image.open(os.path.join(AQUI, '..', 'assets', 'icones', f'{veiculo}@3x.png')).convert('RGBA')
    silhueta = silhueta.crop(silhueta.getchannel('A').getbbox())
    larg = round(2 * r * VEICULO)
    alt = round(silhueta.height * larg / silhueta.width)
    if alt > 2 * r * 0.7:  # a motorizada é alta: limitar pela altura
        alt = round(2 * r * 0.7)
        larg = round(silhueta.width * alt / silhueta.height)
    silhueta = silhueta.resize((larg, alt), Image.LANCZOS)
    tinta = Image.new('RGBA', silhueta.size, TEAL)
    tinta.putalpha(silhueta.getchannel('A'))
    pino.alpha_composite(tinta, (round(cx - larg / 2), round(cy - alt / 2)))
    return pino


def main():
    # gravar() escreve em assets/mapa, ao lado dos outros pinos.
    for tipo, veiculo in VEICULOS.items():
        nome = f'aqui-{tipo}'
        im = pinos.gravar(pino_com(veiculo), nome, (46, 59))
        print(f'{nome:16} 46x59  ponto de baixo a {pinos.ponto_de_baixo(im):.4f}')


if __name__ == '__main__':
    main()
