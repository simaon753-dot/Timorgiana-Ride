#!/usr/bin/env python3
"""Recorta as silhuetas dos veículos para os ícones da app.

ENTRADA: desenho/imagens/branco {1,2,3}.jpeg — a scooter, o carro e a pickup
em preto sobre branco, desenhados pelo Simão (fora do repositório). Há também
a versão branca sobre preto (11, 22, 33); basta uma, porque o que se guarda é
a FORMA e a app é que a pinta.

SAÍDA: assets/icones/veiculo-{mota,carro,carry}{,@2x,@3x}.png, brancas com a
transparência a guardar a forma. O componente Icone pinta-as com a cor pedida,
como fazia com o traço: branco sobre o teal dos cartões, teal sobre o claro
das pastilhas.

Correr:  python3 scripts/recortar-icones-veiculo.py
Precisa: Pillow
"""

import os
from PIL import Image

LARGURA = 64  # a 1x; o maior uso na app é 52 de lado
FONTES = {'mota': 'branco 1.jpeg', 'carro': 'branco 2.jpeg', 'carry': 'branco 3.jpeg'}


def recortar(caminho):
    im = Image.open(caminho).convert('L')
    w, h = im.size
    px = im.load()

    # O desenho é PRETO sobre branco: a cobertura é o escuro de cada pixel.
    # Assim os bordos ficam suaves em vez de serrilhados.
    alfa = Image.new('L', (w, h), 0)
    ap = alfa.load()
    for y in range(h):
        for x in range(w):
            ap[x, y] = 255 - px[x, y]

    caixa = alfa.getbbox()
    branco = Image.new('RGBA', (w, h), (255, 255, 255, 0))
    branco.putalpha(alfa)
    return branco.crop(caixa)


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    imagens = os.path.abspath(os.path.join(aqui, '..', '..', 'desenho', 'imagens'))
    pasta = os.path.join(aqui, '..', 'assets', 'icones')
    os.makedirs(pasta, exist_ok=True)

    for tipo, ficheiro in FONTES.items():
        origem = os.path.join(imagens, ficheiro)
        if not os.path.exists(origem):
            raise SystemExit(f'falta o ficheiro: {origem}')
        desenho = recortar(origem)
        altura = max(1, round(LARGURA * desenho.height / desenho.width))
        for sufixo, escala in (('', 1), ('@2x', 2), ('@3x', 3)):
            alvo = desenho.resize((LARGURA * escala, altura * escala), Image.LANCZOS)
            destino = os.path.join(pasta, f'veiculo-{tipo}{sufixo}.png')
            alvo.save(destino)
            print('escrito', os.path.relpath(destino, aqui), f'{alvo.width}x{alvo.height}')


if __name__ == '__main__':
    main()
