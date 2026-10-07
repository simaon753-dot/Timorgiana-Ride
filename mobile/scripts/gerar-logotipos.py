#!/usr/bin/env python3
"""Gera todos os ficheiros do logótipo a partir do desenho do Simão.

HAKAT (07/10/2026): a app passou a chamar-se HAKAT. Antes era o TGA
«timorgiana ride» sobre preto (ver o histórico do git deste ficheiro).

ENTRADA: desenho/imagens/HAKAT/Logótipo HAKAT com Estrada Dinâmica.jpeg (fora
do repositório; a 2.ª versão dele, 07/10/2026 à noite) — o H teal/coral
atravessado por uma estrada, com a palavra HAKAT por baixo, sobre BRANCO.

AS CORES SÃO AS DA APP (pedido dele: «harmonizar»). O desenho traz um teal
mais verde e um coral mais vermelho do que a app. Cada pixel teal recebe a
MATIZ do teal da app (#0E5C54) e cada pixel coral a do coral (#FF6B4A); a
luminosidade fica — é ela que faz o volume e o brilho do desenho.

SAÍDA, com os mesmos nomes dos ficheiros que substitui:
  assets/logo-completo{,-claro}.png   (H + palavra)
  assets/logo-marca{,-claro}.png      (só o H com a estrada)
  assets/icon.png                     1024  (ícone da app: o H sobre branco — escolha dele)
  assets/adaptive-icon.png            1024  (frente do ícone Android; o fundo branco vem do app.json)
  assets/splash-icon.png              1024  (arranque, sobre branco)
  assets/favicon.png                  48
  ../painel/src/assets/logo-marca.png       (o painel)
  ../painel/public/favicon.png              48
  ../loja/icone-512.png               512   (ficha da Play Store)
  ../loja/destaque-1024x500.png       1024x500

O FUNDO SAI A PARTIR DAS BORDAS: o desenho tem branco dentro (os traços da
estrada), e esse fica — só o branco ligado ao exterior é fundo. Na orla, o
branco sai «misturado» (cor para alfa), para não deixar um halo claro sobre o
teal dos ecrãs.

A VARIANTE CLARA sobe a luminosidade dos TEAIS e deixa o coral em paz: a
estrada e a palavra são teal escuro e desapareciam sobre o teal dos ecrãs.

Correr:  python3 scripts/gerar-logotipos.py
Precisa: Pillow
"""

import os
from PIL import Image, ImageDraw, ImageFilter

BRANCO = (255, 255, 255)  # o fundo do ícone e do arranque, o mesmo do app.json


def sem_branco(caminho):
    im = Image.open(caminho).convert('RGB')
    w, h = im.size
    # O desenho vem sobre branco liso, sem cartão: nada a cortar à volta.
    px = im.load()
    claro = Image.new('L', (w, h), 0)
    cp = claro.load()
    for y in range(h):
        for x in range(w):
            # Claro e quase sem cor: o branco do cartão e o cinzento da sua
            # borda (que um limiar só de claridade deixava como uma linha).
            if min(px[x, y]) > 175 and max(px[x, y]) - min(px[x, y]) < 30:
                cp[x, y] = 255
    for semente in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if cp[semente] == 255:
            ImageDraw.floodfill(claro, semente, 128)
    fundo = claro.point(lambda v: 255 if v == 128 else 0)
    orla = fundo.filter(ImageFilter.MaxFilter(5))
    op = orla.load()
    fdp = fundo.load()
    fora = Image.new('RGBA', (w, h))
    fp = fora.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if fdp[x, y]:
                # O fundo sai inteiro — tratado como «cor para alfa», o
                # cinzento por fora do cartão virava uma sombra visível.
                fp[x, y] = (0, 0, 0, 0)
            elif op[x, y]:
                # Cor para alfa contra o branco.
                a = max(255 - r, 255 - g, 255 - b)
                if a == 0:
                    fp[x, y] = (0, 0, 0, 0)
                else:
                    k = 255 / a
                    fp[x, y] = tuple(max(0, min(255, int(255 - (255 - c) * k))) for c in (r, g, b)) + (a,)
            else:
                fp[x, y] = (r, g, b, 255)
    return fora.crop(fora.getchannel('A').getbbox())


TEAL_APP = (0x0E, 0x5C, 0x54)
CORAL_APP = (0xFF, 0x6B, 0x4A)


def harmonizar(imagem):
    """Dá a cada pixel teal a matiz do teal da app e a cada pixel coral a do
    coral; a luminosidade e a saturação ficam (são o desenho)."""
    import colorsys
    h_teal = colorsys.rgb_to_hls(*[c / 255 for c in TEAL_APP])[0]
    h_coral = colorsys.rgb_to_hls(*[c / 255 for c in CORAL_APP])[0]
    im = imagem.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if s < 0.12:
                continue  # brancos e cinzentos (os traços da estrada)
            if 0.38 < h < 0.60:
                h = h_teal
            elif h < 0.12 or h > 0.92:
                h = h_coral
            else:
                continue
            px[x, y] = tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, l, s)) + (a,)
    return im


def aclarar(imagem, quanto=0.45):
    """Sobe a luminosidade dos teais e deixa o coral em paz. Sobe em HLS, com
    a matiz e a saturação no sítio: misturar com branco deixava o teal
    acinzentado sobre o teal dos ecrãs (visto a 07/10/2026)."""
    import colorsys
    im = imagem.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a and (g > r * 1.15 and b > r * 1.05):
                h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
                l = l + (0.92 - l) * quanto
                s = s * 0.6  # sem isto o teal claro ficava fluorescente
                px[x, y] = tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, l, s)) + (a,)
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
    origem = os.path.abspath(os.path.join(aqui, '..', '..', 'desenho', 'imagens', 'HAKAT', 'Logótipo HAKAT com Estrada Dinâmica.jpeg'))
    if not os.path.exists(origem):
        raise SystemExit(f'falta o ficheiro: {origem}')
    assets = os.path.join(aqui, '..', 'assets')
    raiz = os.path.abspath(os.path.join(aqui, '..', '..'))
    loja = os.path.join(raiz, 'loja')

    completo = harmonizar(sem_branco(origem))
    completo_claro = aclarar(completo, 0.38)
    marca = partir(completo)
    marca_clara = aclarar(marca, 0.38)
    # As telas seguem as proporções do desenho novo (o H é mais largo que alto
    # do que era o TGA); o Logo.js usa estas mesmas medidas.
    m_alt = 200
    m_larg = round(marca.width * m_alt / marca.height)
    c_larg = 512
    c_alt = round(completo.height * c_larg / completo.width)
    print(f'proporções: marca {m_larg}x{m_alt}, completo {c_larg}x{c_alt}')

    saidas = [
        (encaixar(completo, c_larg, c_alt, margem=0), os.path.join(assets, 'logo-completo.png')),
        (encaixar(completo_claro, c_larg, c_alt, margem=0), os.path.join(assets, 'logo-completo-claro.png')),
        (encaixar(marca, m_larg, m_alt, margem=0), os.path.join(assets, 'logo-marca.png')),
        (encaixar(marca_clara, m_larg, m_alt, margem=0), os.path.join(assets, 'logo-marca-claro.png')),
        # O ícone da app: o H sobre branco (decisão dele, 07/10/2026).
        (encaixar(marca, 1024, 1024, fundo=BRANCO, ocupa=0.84), os.path.join(assets, 'icon.png')),
        # A frente do ícone adaptativo do Android fica mais pequena: o sistema
        # recorta-a num círculo, e o que sair da zona segura desaparece.
        (encaixar(marca, 1024, 1024, ocupa=0.62), os.path.join(assets, 'adaptive-icon.png')),
        (encaixar(completo, 1024, 1024, ocupa=0.62), os.path.join(assets, 'splash-icon.png')),
        (encaixar(marca, 48, 48), os.path.join(assets, 'favicon.png')),
        (encaixar(marca, m_larg, m_alt, margem=0), os.path.join(raiz, 'painel', 'src', 'assets', 'logo-marca.png')),
        (encaixar(marca, 48, 48), os.path.join(raiz, 'painel', 'public', 'favicon.png')),
        (encaixar(marca, 512, 512, fundo=BRANCO, ocupa=0.84), os.path.join(loja, 'icone-512.png')),
        (encaixar(completo, 1024, 500, fundo=BRANCO, ocupa=0.72), os.path.join(loja, 'destaque-1024x500.png')),
    ]
    for imagem, destino in saidas:
        imagem.save(destino, optimize=True)
        print(f'escrito {os.path.relpath(destino, aqui)} {imagem.width}x{imagem.height} '
              f'{os.path.getsize(destino) // 1024} KB')


if __name__ == '__main__':
    main()
