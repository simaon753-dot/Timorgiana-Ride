#!/usr/bin/env python3
"""Gera todos os ficheiros do logótipo a partir do desenho do Simão.

HAKAT, 3.ª versão (08/10/2026): SÓ AS LETRAS «HAKAT», vetoriais — o H com uma
fita teal, os dois A com um triângulo coral. As versões anteriores (o H com
uma estrada, 07/10) estão no histórico do git deste ficheiro.

ENTRADA: desenho/imagens/HAKAT/HAKAT letras.svg (fora do repositório; veio
como «LOG HAKAT.svg»). É VETORIAL e de fundo transparente: nada de recortar
fundo nem de adivinhar orlas. O Chrome desenha-o (sem programas a instalar).

AS CORES FICAM COMO ELE AS DESENHOU. O verde das letras e o teal da fita são
o desenho; trazê-los para uma só matiz (como se fez à 2.ª versão) apagava o
contraste entre os dois. O coral já é o da app.

SAÍDA, com os mesmos nomes dos ficheiros que substitui:
  assets/logo-completo{,-claro}.png   as letras HAKAT (cabeçalhos grandes, entrada)
  assets/icon.png                     1024  a PALAVRA HAKAT sobre branco (pedido dele,
                                            08/10: «o ícone deve mostrar HAKAT»)
  assets/adaptive-icon.png            1024  a palavra, dentro do círculo do Android
                                            (fundo branco no app.json)
  assets/splash-icon.png              1024  as letras, sobre branco
  assets/favicon.png                  48
  ../painel/src/assets/logo-marca.png       (o painel)
  ../painel/public/favicon.png              48
  ../loja/icone-512.png               512   (ficha da Play Store)
  ../loja/destaque-1024x500.png       1024x500

AS VARIANTES «-claro» (ecrãs teal) TÊM AS CORES ORIGINAIS + UM CONTORNO
BRANCO FINO. Ele não quer o logótipo de outra cor («isto não podia ser
mudado», 08/10/2026); mas o verde escuro das letras (#005B50) é quase o teal
do véu da entrada e partes do H e do K sumiam (fotografia do Samsung). O
contorno separa as letras do fundo sem lhes tocar na cor.

Correr:  python3 scripts/gerar-logotipos.py
Precisa: Pillow e o Google Chrome
"""

import os
import subprocess
import tempfile

from PIL import Image, ImageChops, ImageDraw, ImageFilter

BRANCO = (255, 255, 255)  # o fundo do ícone e do arranque, o mesmo do app.json
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def desenhar_svg(caminho, largura=4096):
    """O SVG em PNG transparente, pelo Chrome sem janela."""
    with tempfile.TemporaryDirectory() as pasta:
        # A proporção do SVG é 2048×682; a janela segue-a.
        altura = round(largura * 682 / 2048)
        html = os.path.join(pasta, 'p.html')
        png = os.path.join(pasta, 'p.png')
        with open(html, 'w') as f:
            f.write(f'<html><body style="margin:0;background:transparent"><img src="file://{caminho}" '
                    f'style="width:{largura}px;height:{altura}px;display:block"></body></html>')
        subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                        '--default-background-color=00000000', f'--window-size={largura},{altura}',
                        f'--screenshot={png}', f'file://{html}'], check=True, capture_output=True)
        im = Image.open(png).convert('RGBA')
        im.load()
    return im.crop(im.getbbox())


def so_o_h(letras):
    """O H sozinho. O pé do A encosta-lhe no canto de baixo, mas há um vão
    transparente entre os dois: fica só a forma ligada ao H."""
    regiao = letras.crop((0, 0, round(letras.width * 0.22), letras.height))
    cheio = regiao.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    ImageDraw.floodfill(cheio, (round(regiao.width * 0.17), round(regiao.height * 0.5)), 128)
    manter = cheio.point(lambda v: 255 if v == 128 else 0).filter(ImageFilter.MaxFilter(3))
    regiao.putalpha(ImageChops.multiply(regiao.getchannel('A'), manter))
    return regiao.crop(regiao.getbbox())


def com_contorno(imagem, raio):
    """As cores intactas, com um contorno branco de `raio` píxeis à volta."""
    alfa = imagem.getchannel('A')
    folga = raio + 2
    tela = Image.new('RGBA', (imagem.width + 2 * folga, imagem.height + 2 * folga), (0, 0, 0, 0))
    grande = Image.new('L', tela.size, 0)
    grande.paste(alfa, (folga, folga))
    contorno = grande.filter(ImageFilter.MaxFilter(2 * raio + 1)).filter(ImageFilter.GaussianBlur(1))
    tela.paste(Image.new('RGBA', tela.size, (255, 255, 255, 255)), (0, 0), contorno)
    tela.alpha_composite(imagem, (folga, folga))
    return tela


def encaixar(desenho, larg, alt, fundo=None, margem=0.04, ocupa=1.0):
    tela = Image.new('RGBA', (larg, alt), (fundo + (255,)) if fundo else (0, 0, 0, 0))
    util = (larg * (1 - 2 * margem) * ocupa, alt * (1 - 2 * margem) * ocupa)
    escala = min(util[0] / desenho.width, util[1] / desenho.height)
    novo = desenho.resize((max(1, int(desenho.width * escala)), max(1, int(desenho.height * escala))), Image.LANCZOS)
    tela.paste(novo, ((larg - novo.width) // 2, (alt - novo.height) // 2), novo)
    return tela


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    origem = os.path.abspath(os.path.join(aqui, '..', '..', 'desenho', 'imagens', 'HAKAT', 'HAKAT letras.svg'))
    if not os.path.exists(origem):
        raise SystemExit(f'falta o ficheiro: {origem}')
    assets = os.path.join(aqui, '..', 'assets')
    raiz = os.path.abspath(os.path.join(aqui, '..', '..'))
    loja = os.path.join(raiz, 'loja')

    completo = desenhar_svg(origem)
    # O desenho tem ~3700 px de largura e o ficheiro final 768: 11 px aqui são
    # ~2 px no ficheiro, ~1 dp no ecrã.
    completo_claro = com_contorno(completo, 11)
    marca = so_o_h(completo)
    # As telas seguem as proporções do desenho; o Logo.js usa estas medidas.
    m_alt = 200
    m_larg = round(marca.width * m_alt / marca.height)
    c_larg = 768
    c_alt = round(completo.height * c_larg / completo.width)
    print(f'proporções: marca {m_larg}x{m_alt}, completo {c_larg}x{c_alt}')

    saidas = [
        (encaixar(completo, c_larg, c_alt, margem=0), os.path.join(assets, 'logo-completo.png')),
        (encaixar(completo_claro, c_larg, c_alt, margem=0), os.path.join(assets, 'logo-completo-claro.png')),
        (encaixar(completo, 1024, 1024, fundo=BRANCO, ocupa=0.9), os.path.join(assets, 'icon.png')),
        # A frente do ícone adaptativo do Android: o sistema recorta-a num
        # círculo (zona segura = 66% do lado), e uma palavra seis vezes mais
        # larga que alta só cabe se a largura for ~0,65 do lado.
        (encaixar(completo, 1024, 1024, ocupa=0.66), os.path.join(assets, 'adaptive-icon.png')),
        (encaixar(completo, 1024, 1024, ocupa=0.7), os.path.join(assets, 'splash-icon.png')),
        (encaixar(marca, 48, 48), os.path.join(assets, 'favicon.png')),
        (encaixar(marca, m_larg, m_alt, margem=0), os.path.join(raiz, 'painel', 'src', 'assets', 'logo-marca.png')),
        (encaixar(marca, 48, 48), os.path.join(raiz, 'painel', 'public', 'favicon.png')),
        (encaixar(completo, 512, 512, fundo=BRANCO, ocupa=0.9), os.path.join(loja, 'icone-512.png')),
        (encaixar(completo, 1024, 500, fundo=BRANCO, ocupa=0.8), os.path.join(loja, 'destaque-1024x500.png')),
    ]
    for imagem, destino in saidas:
        imagem.save(destino, optimize=True)
        print(f'escrito {os.path.relpath(destino, aqui)} {imagem.width}x{imagem.height} '
              f'{os.path.getsize(destino) // 1024} KB')


if __name__ == '__main__':
    main()
