#!/usr/bin/env python3
"""Materiais gráficos para a ficha do Google Play.

PORQUE EXISTE. A loja pede dois ficheiros com medidas exactas que não existem
em lado nenhum do projecto: o ícone a 512x512 e o gráfico de destaque a
1024x500. Feitos à mão num editor, ficam sem fonte — daqui a um ano ninguém
sabe de onde vieram nem como refazer um com a cor certa.

Gerados do mesmo ícone e do mesmo logótipo que a app usa, com as cores da
marca escritas aqui uma vez.

Correr:  python3 loja/gerar.py
Precisa: Pillow
"""

import os
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(AQUI, '..', 'mobile', 'assets')

TEAL = (14, 92, 84)
CORAL = (232, 85, 49)
CREME = (251, 247, 240)


def icone_da_loja():
    """512x512, a partir do ícone de 1024 que a app já tem."""
    img = Image.open(os.path.join(APP, 'icon.png')).convert('RGBA')
    alvo = img.resize((512, 512), Image.LANCZOS)
    # A loja não aceita transparência no ícone: por baixo vai a cor da marca,
    # senão o Google põe preto e o ícone fica com um halo escuro.
    fundo = Image.new('RGB', (512, 512), CREME)
    fundo.paste(alvo, (0, 0), alvo)
    return fundo


def grafico_de_destaque():
    """1024x500 — a faixa larga no topo da ficha da loja.

    Sem texto de propósito. O Google mostra este gráfico em tamanhos muito
    diferentes conforme o sítio, e recorta-o pelos lados; texto colocado aqui
    fica cortado numa metade dos ecrãs. O nome da app aparece por baixo,
    escrito pela própria loja.
    """
    img = Image.new('RGB', (1024, 500), TEAL)
    d = ImageDraw.Draw(img)

    # Duas formas suaves nos cantos, para a faixa não ser um rectângulo liso.
    # Nos cantos de propósito: é a zona que o recorte come primeiro.
    d.ellipse([760, -200, 1300, 340], fill=(20, 106, 97))
    d.ellipse([-160, 260, 260, 680], fill=(11, 74, 68))

    logo = Image.open(os.path.join(APP, 'logo-completo-claro.png')).convert('RGBA')
    # AO CENTRO, e não encostado.
    #
    # O Google mostra esta faixa em proporções diferentes conforme o sítio e
    # RECORTA-A PELOS LADOS. Um logótipo à esquerda desaparece metade num
    # telemóvel estreito — e é a única imagem da ficha antes de alguém decidir
    # se instala.
    largura = int(logo.width * (260 / logo.height))
    logo = logo.resize((largura, 260), Image.LANCZOS)
    img.paste(logo, ((1024 - largura) // 2, (500 - 260) // 2), logo)

    # Uma barra coral fina em baixo: a cor da acção da app, sem competir.
    d.rectangle([0, 492, 1024, 500], fill=CORAL)
    return img


def main():
    icone_da_loja().save(os.path.join(AQUI, 'icone-512.png'))
    grafico_de_destaque().save(os.path.join(AQUI, 'destaque-1024x500.png'))
    for f in ('icone-512.png', 'destaque-1024x500.png'):
        c = os.path.join(AQUI, f)
        print('escrito loja/%s  (%.0f KB)' % (f, os.path.getsize(c) / 1024))


if __name__ == '__main__':
    main()
