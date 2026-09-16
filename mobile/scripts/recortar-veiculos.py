#!/usr/bin/env python3
"""Recorta os distintivos do veículo para o mapa, dos desenhos do Simão.

PORQUE NÃO SÃO DESENHADOS EM CÓDIGO, como os pinos. As silhuetas (a scooter,
o sedan, a pickup) têm detalhe a mais para redesenhar à mão sem perder o
desenho — e o desenho é dele. Os pinos são formas simples e por isso vivem em
código; estes vivem como imagem.

ENTRADA: desenho/imagens/Localização {de motorista,do carro,do carro pickup}.jpg
— fora do repositório, como as outras imagens de trabalho. Cada ficheiro tem o
distintivo redondo sobre fundo preto.

SAÍDA: assets/mapa/veiculo-{motorbike,car,carry}{,@2x,@3x}.png, 40x40 como o
carro que substituem, com tudo o que está fora do círculo transparente.

Correr:  python3 scripts/recortar-veiculos.py
Precisa: Pillow
"""

import os
from PIL import Image, ImageDraw

LADO = 40  # o mesmo tamanho do marcador que já existia
FONTES = {
    'motorbike': 'Localização de motorista.jpg',
    'car': 'Localização do carro.jpg',
    'carry': 'Localização do carro pickup.jpg',
}


def recortar(caminho):
    """Devolve o distintivo redondo, quadrado e com o resto transparente."""
    im = Image.open(caminho).convert('RGB')
    px = im.load()
    w, h = im.size

    # O fundo é PRETO e o distintivo tem um anel branco por fora: a caixa do
    # que não é preto é a caixa do distintivo.
    xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if r + g + b > 90:
                xs.append(x)
                ys.append(y)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    lado = max(x1 - x0, y1 - y0) + 1
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    caixa = im.crop(
        (int(cx - lado / 2), int(cy - lado / 2), int(cx + lado / 2), int(cy + lado / 2))
    ).convert('RGBA')

    # A máscara é um círculo um pouco mais pequeno do que a caixa: o bordo do
    # anel branco está esbatido contra o preto, e sem esta margem ficava um fio
    # escuro à volta do distintivo.
    S = 8  # desenha-se a máscara maior e reduz-se, para o bordo sair suave
    m = Image.new('L', (caixa.width * S, caixa.height * S), 0)
    ImageDraw.Draw(m).ellipse(
        [2 * S, 2 * S, caixa.width * S - 2 * S, caixa.height * S - 2 * S], fill=255
    )
    caixa.putalpha(m.resize(caixa.size, Image.LANCZOS))
    return caixa


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    imagens = os.path.abspath(os.path.join(aqui, '..', '..', 'desenho', 'imagens'))
    pasta = os.path.join(aqui, '..', 'assets', 'mapa')
    os.makedirs(pasta, exist_ok=True)

    for tipo, ficheiro in FONTES.items():
        origem = os.path.join(imagens, ficheiro)
        if not os.path.exists(origem):
            raise SystemExit(f'falta o ficheiro: {origem}')
        distintivo = recortar(origem)
        for sufixo, escala in (('', 1), ('@2x', 2), ('@3x', 3)):
            alvo = distintivo.resize((LADO * escala, LADO * escala), Image.LANCZOS)
            destino = os.path.join(pasta, f'veiculo-{tipo}{sufixo}.png')
            alvo.save(destino)
            print('escrito', os.path.relpath(destino, aqui))


if __name__ == '__main__':
    main()
