#!/usr/bin/env python3
"""Prepara as ilustrações a cores e a seta do mapa, dos desenhos do Simão.

ENTRADA (desenho/imagens, fora do repositório):
  Icone passageiro no bem-vindo.jpeg · Icone início.jpeg ·
  icone rendimentu.jpeg · icone viajen.jpeg · icone para vista grande do map.jpeg

SAÍDA:
  assets/ilustracoes/{passageiro,inicio,rendimento,viagens}{,@2x,@3x}.png — a
  cores, com o fundo branco retirado.
  assets/icones/expandir{,@2x,@3x}.png — só a seta, em branco com a forma na
  transparência, para a app a pintar como os outros ícones.

O FUNDO NÃO SE APAGA POR COR. A casa tem paredes creme e o relógio tem o
mostrador branco: apagar "tudo o que é branco" esburacava-os. Apaga-se a
partir das BORDAS, como um balde de tinta, para só sair o que está à volta do
desenho; depois suaviza-se o bordo, senão fica serrilhado.

Correr:  python3 scripts/recortar-ilustracoes.py
Precisa: Pillow
"""

import os
from collections import deque
from PIL import Image, ImageFilter

CORES = {
    'passageiro': ('Icone passageiro no bem-vindo.jpeg', 96),
    'inicio': ('Icone início.jpeg', 48),
    'rendimento': ('icone rendimentu.jpeg', 48),
    'viagens': ('icone viajen.jpeg', 48),
}
SETA = ('icone para vista grande do map.jpeg', 'expandir', 24)


def sem_fundo(caminho, limite=238):
    """Tira o fundo a partir das bordas e devolve a imagem recortada."""
    im = Image.open(caminho).convert('RGB')
    w, h = im.size
    px = im.load()
    claro = lambda p: p[0] >= limite and p[1] >= limite and p[2] >= limite

    fundo = bytearray(w * h)
    fila = deque()
    for x in range(w):
        for y in (0, h - 1):
            if claro(px[x, y]) and not fundo[y * w + x]:
                fundo[y * w + x] = 1
                fila.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if claro(px[x, y]) and not fundo[y * w + x]:
                fundo[y * w + x] = 1
                fila.append((x, y))
    while fila:
        x, y = fila.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not fundo[ny * w + nx] and claro(px[nx, ny]):
                fundo[ny * w + nx] = 1
                fila.append((nx, ny))

    alfa = Image.frombytes('L', (w, h), bytes(255 if not v else 0 for v in fundo))
    alfa = alfa.filter(ImageFilter.GaussianBlur(1.2))
    fora = im.convert('RGBA')
    fora.putalpha(alfa)
    return fora.crop(alfa.getbbox())


def so_a_forma(caminho, limite=200):
    """Guarda só o desenho colorido (a seta), em branco, na transparência."""
    im = Image.open(caminho).convert('RGB')
    w, h = im.size
    px = im.load()
    alfa = Image.new('L', (w, h), 0)
    ap = alfa.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            # A seta é teal (pouco vermelho); o círculo e o fundo são claros.
            ap[x, y] = 255 if r < limite else 0
    alfa = alfa.filter(ImageFilter.GaussianBlur(0.8))
    branco = Image.new('RGBA', (w, h), (255, 255, 255, 0))
    branco.putalpha(alfa)
    return branco.crop(alfa.getbbox())


def gravar(imagem, pasta, nome, largura):
    altura = max(1, round(largura * imagem.height / imagem.width))
    for sufixo, escala in (('', 1), ('@2x', 2), ('@3x', 3)):
        alvo = imagem.resize((largura * escala, altura * escala), Image.LANCZOS)
        destino = os.path.join(pasta, f'{nome}{sufixo}.png')
        alvo.save(destino)
        print('escrito', os.path.basename(destino), f'{alvo.width}x{alvo.height}')


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    imagens = os.path.abspath(os.path.join(aqui, '..', '..', 'desenho', 'imagens'))
    ilustracoes = os.path.join(aqui, '..', 'assets', 'ilustracoes')
    icones = os.path.join(aqui, '..', 'assets', 'icones')
    os.makedirs(ilustracoes, exist_ok=True)
    os.makedirs(icones, exist_ok=True)

    for nome, (ficheiro, largura) in CORES.items():
        origem = os.path.join(imagens, ficheiro)
        if not os.path.exists(origem):
            raise SystemExit(f'falta o ficheiro: {origem}')
        gravar(sem_fundo(origem), ilustracoes, nome, largura)

    ficheiro, nome, largura = SETA
    gravar(so_a_forma(os.path.join(imagens, ficheiro)), icones, nome, largura)


if __name__ == '__main__':
    main()
