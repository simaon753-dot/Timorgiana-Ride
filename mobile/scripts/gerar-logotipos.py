#!/usr/bin/env python3
"""Gera todos os ficheiros do logótipo a partir do desenho do Simão.

ENTRADA: desenho/imagens/Novo logo.jpg (fora do repositório) — o TGA com a
palavra "timorgiana ride", em coral e teal sobre PRETO.

SAÍDA, com as mesmas telas e nomes dos ficheiros que substitui, para nada
mudar de tamanho nos ecrãs:
  assets/logo-completo{,-claro}.png   512x448  (TGA + palavra)
  assets/logo-marca{,-claro}.png      256x200  (só o TGA)
  assets/icon.png                     1024     (ícone da app, teal opaco)
  assets/adaptive-icon.png            1024     (frente do ícone Android)
  assets/splash-icon.png              1024     (arranque, sobre teal)
  assets/favicon.png                  48
  ../loja/icone-512.png               512      (ficha da Play Store)
  ../loja/destaque-1024x500.png       1024x500 (imagem de destaque)

O FUNDO SAI POR SER PRETO, e não pelas bordas: dentro das letras há vazios
(o G, o A, a estrada) que também são fundo e que um balde de tinta lançado
das bordas nunca alcançaria. Aqui a regra é outra — o desenho não tem preto
nenhum, logo tudo o que é escuro é fundo.

A VARIANTE CLARA sobe a luminosidade dos TEAIS e deixa o coral em paz, que já
contrasta sobre o teal escuro dos ecrãs. É a regra que o componente Logo.js
descreve, e existia nos ficheiros antigos.

Correr:  python3 scripts/gerar-logotipos.py
Precisa: Pillow
"""

import os
from PIL import Image

TEAL = (14, 92, 84)  # o fundo teal da marca, o mesmo do app.json


def sem_preto(caminho, limiar_baixo=10, limiar_alto=46):
    im = Image.open(caminho).convert('RGB')
    w, h = im.size
    px = im.load()
    alfa = Image.new('L', (w, h), 0)
    ap = alfa.load()
    for y in range(h):
        for x in range(w):
            v = max(px[x, y])
            ap[x, y] = 0 if v <= limiar_baixo else (
                255 if v >= limiar_alto else int((v - limiar_baixo) * 255 / (limiar_alto - limiar_baixo))
            )
    fora = im.convert('RGBA')
    fora.putalpha(alfa)
    return fora.crop(alfa.getbbox())


def aclarar(imagem, quanto=0.45):
    """Sobe a luminosidade dos teais; o coral fica como está."""
    im = imagem.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a and (g > r * 1.15 and b > r * 1.05):
                px[x, y] = (
                    int(r + (255 - r) * quanto),
                    int(g + (255 - g) * quanto),
                    int(b + (255 - b) * quanto),
                    a,
                )
    return im


def partir(imagem):
    """Separa o símbolo (em cima) da palavra (em baixo) pela faixa vazia."""
    alfa = imagem.getchannel('A')
    linhas = [max(alfa.crop((0, y, imagem.width, y + 1)).getextrema()) for y in range(imagem.height)]
    vazias = [y for y, v in enumerate(linhas) if v < 8]
    # A faixa vazia mais longa abaixo do meio é a que separa os dois.
    melhor, atual = (0, 0), []
    for y in vazias:
        if y < imagem.height * 0.5:
            continue
        if atual and y == atual[-1] + 1:
            atual.append(y)
        else:
            atual = [y]
        if len(atual) > melhor[1] - melhor[0]:
            melhor = (atual[0], atual[-1])
    corte = (melhor[0] + melhor[1]) // 2 if melhor[1] else imagem.height
    simbolo = imagem.crop((0, 0, imagem.width, corte))
    return simbolo.crop(simbolo.getchannel('A').getbbox())


def encaixar(desenho, larg, alt, fundo=None, margem=0.04, ocupa=1.0):
    tela = Image.new('RGBA', (larg, alt), (fundo + (255,)) if fundo else (0, 0, 0, 0))
    util = (larg * (1 - 2 * margem) * ocupa, alt * (1 - 2 * margem) * ocupa)
    escala = min(util[0] / desenho.width, util[1] / desenho.height)
    novo = desenho.resize((max(1, int(desenho.width * escala)), max(1, int(desenho.height * escala))), Image.LANCZOS)
    tela.paste(novo, ((larg - novo.width) // 2, (alt - novo.height) // 2), novo)
    return tela


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    origem = os.path.abspath(os.path.join(aqui, '..', '..', 'desenho', 'imagens', 'Novo logo.jpg'))
    if not os.path.exists(origem):
        raise SystemExit(f'falta o ficheiro: {origem}')
    assets = os.path.join(aqui, '..', 'assets')
    loja = os.path.abspath(os.path.join(aqui, '..', '..', 'loja'))

    completo = sem_preto(origem)
    completo_claro = aclarar(completo)
    marca = partir(completo)
    marca_clara = aclarar(marca)

    saidas = [
        (encaixar(completo, 512, 448), os.path.join(assets, 'logo-completo.png')),
        (encaixar(completo_claro, 512, 448), os.path.join(assets, 'logo-completo-claro.png')),
        (encaixar(marca, 256, 200), os.path.join(assets, 'logo-marca.png')),
        (encaixar(marca_clara, 256, 200), os.path.join(assets, 'logo-marca-claro.png')),
        # O ícone da app: a marca clara sobre o teal, como estava.
        (encaixar(marca_clara, 1024, 1024, fundo=TEAL, ocupa=0.78), os.path.join(assets, 'icon.png')),
        # A frente do ícone adaptativo do Android fica mais pequena: o sistema
        # recorta-a num círculo, e o que sair da zona segura desaparece.
        (encaixar(marca_clara, 1024, 1024, ocupa=0.62), os.path.join(assets, 'adaptive-icon.png')),
        (encaixar(completo_claro, 1024, 1024, ocupa=0.82), os.path.join(assets, 'splash-icon.png')),
        (encaixar(marca, 48, 48), os.path.join(assets, 'favicon.png')),
        (encaixar(marca_clara, 512, 512, fundo=TEAL, ocupa=0.78), os.path.join(loja, 'icone-512.png')),
        (encaixar(completo_claro, 1024, 500, fundo=TEAL, ocupa=0.72), os.path.join(loja, 'destaque-1024x500.png')),
    ]
    for imagem, destino in saidas:
        imagem.save(destino, optimize=True)
        print(f'escrito {os.path.relpath(destino, aqui)} {imagem.width}x{imagem.height} '
              f'{os.path.getsize(destino) // 1024} KB')


if __name__ == '__main__':
    main()
