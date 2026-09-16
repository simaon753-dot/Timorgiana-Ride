#!/usr/bin/env python3
"""Recorta os volantes do botão de ficar disponível, dos desenhos do Simão.

ENTRADA: desenho/imagens/Ready or ... {Bike,car,Pickup}.jpeg — fora do
repositório, como as outras imagens de trabalho. Cada um traz o comando do
veículo (o guiador da scooter, o volante do carro, o volante da pickup) numa
só cor sobre fundo branco.

SAÍDA: assets/volante/volante-{motorbike,car,carry}{,@2x,@3x}.png, com o
desenho em BRANCO e a transparência a guardar a forma. É de propósito: a app
pinta-o com `tintColor` conforme o estado — verde disponível, vermelho parado
— e para isso só interessa a forma, não a cor do ficheiro.

Correr:  python3 scripts/recortar-volantes.py
Precisa: Pillow
"""

import os
from PIL import Image

LADO = 104  # dentro do botão de 120
FONTES = {
    'motorbike': 'Ready or Not ready for Bike.jpeg',
    'car': 'Ready or not readu for car.jpeg',
    'carry': 'Ready or not ready for Pickup.jpeg',
}


def recortar(caminho):
    im = Image.open(caminho).convert('RGB')
    w, h = im.size
    px = im.load()

    # A cobertura do traço lê-se no canal VERMELHO: o verde do desenho tem
    # pouco vermelho e o fundo branco tem-no todo. Assim a transparência sai
    # suave nos bordos, sem serrilha.
    fundo = 255
    traco = min(px[x, y][0] for y in range(0, h, 4) for x in range(0, w, 4))
    alfa = Image.new('L', (w, h), 0)
    ap = alfa.load()
    for y in range(h):
        for x in range(w):
            v = (fundo - px[x, y][0]) / max(1, fundo - traco)
            ap[x, y] = max(0, min(255, int(v * 255)))

    # A caixa do desenho, para o recorte ficar justo e quadrado.
    caixa = alfa.getbbox()
    x0, y0, x1, y1 = caixa
    lado = max(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    corte = (int(cx - lado / 2), int(cy - lado / 2), int(cx + lado / 2), int(cy + lado / 2))

    branco = Image.new('RGBA', (w, h), (255, 255, 255, 0))
    branco.putalpha(alfa)
    return branco.crop(corte)


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    imagens = os.path.abspath(os.path.join(aqui, '..', '..', 'desenho', 'imagens'))
    pasta = os.path.join(aqui, '..', 'assets', 'volante')
    os.makedirs(pasta, exist_ok=True)

    for tipo, ficheiro in FONTES.items():
        origem = os.path.join(imagens, ficheiro)
        if not os.path.exists(origem):
            raise SystemExit(f'falta o ficheiro: {origem}')
        desenho = recortar(origem)
        for sufixo, escala in (('', 1), ('@2x', 2), ('@3x', 3)):
            alvo = desenho.resize((LADO * escala, LADO * escala), Image.LANCZOS)
            destino = os.path.join(pasta, f'volante-{tipo}{sufixo}.png')
            alvo.save(destino)
            print('escrito', os.path.relpath(destino, aqui))


if __name__ == '__main__':
    main()
