#!/usr/bin/env python3
"""Os pinos do Simão (07/10/2026): gota com círculo branco e ponto por baixo.

DUAS RONDAS NO MESMO DIA: de manhã com um anel branco; à tarde a versão que
ele chamou FINAL, com o círculo branco cheio. É esta que vale.

ENTRADA  desenho/imagens/Pinos finais 07-10/pino {recolha,destino}.png  (fora do git)
SAÍDA    assets/mapa/pino-{origem,destino}{,-pequeno}{,@2x,@3x}.png

O MESMO TAMANHO DOS ANTERIORES, ao ponto — foi o pedido. Os grandes ficam em
46 × 59 e os pequenos (as paragens alternativas) em 26 × 33: a altura é a dos
ficheiros antigos, e a arte, um pouco mais estreita, fica ao centro da mesma
largura. Assim nada à volta muda de lugar no ecrã.

O PONTO DE BAIXO É A ÂNCORA. O marcador aponta ao sítio pelo centro do ponto
por baixo da ponta (`ANCORA_Y` no MapaGoogle.js). Este guião mede onde esse
ponto ficou e escreve-o no fim, para conferir com a constante — e também o
VÃO entre a ponta e o ponto, onde a mira se corta em duas (`CORTE_DO_PONTO`).
Os dois números mudam com o desenho: esquecer o segundo partiu o ponto da
mira a 07/10/2026.

As funções de recorte e de cor são as do recortar-novos-icones.py: o preto
sai em todo o sítio (o anel branco fica, é o miolo do pino) e o verde vai para
#0E5C54, ao pixel, a cor da linha da rota. O coral fica como veio.

Correr:  python3 scripts/recortar-pinos-novos.py
"""

import importlib.util
import os

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('icones', os.path.join(AQUI, 'recortar-novos-icones.py'))
icones = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(icones)

ORIGEM = os.path.abspath(os.path.join(AQUI, '..', '..', 'desenho', 'imagens', 'Pinos finais 07-10'))
DESTINO = os.path.join(AQUI, '..', 'assets', 'mapa')

# A luminosidade do corpo teal destes desenhos (#017B7A), medida: com ela o
# corpo sai exactamente em #0E5C54.
L_CORPO_RECOLHA = (123 + 1) / 2 / 255

# nome de saída -> (ficheiro, tamanho em pontos, pintar de teal?)
PINOS = {
    'pino-origem': ('pino recolha.png', (46, 59), True),
    'pino-destino': ('pino destino.png', (46, 59), False),
    'pino-origem-pequeno': ('pino recolha.png', (26, 33), True),
    'pino-destino-pequeno': ('pino destino.png', (26, 33), False),
}


def arte(ficheiro, teal):
    caminho = os.path.join(ORIGEM, ficheiro)
    if not os.path.exists(caminho):
        raise SystemExit(f'falta o ficheiro: {caminho}')
    if teal:
        return icones.sem_preto(caminho, alvo=icones.PINO_TEAL, l_origem=L_CORPO_RECOLHA)
    # O coral não passa pelo repintar: _teal() não o reconhece, e fica como veio.
    return icones.sem_preto(caminho)


def ponto_de_baixo(im):
    """O centro vertical do ponto por baixo da ponta, em fracção da altura."""
    alfa = im.split()[3]
    w, h = im.size
    linhas = [y for y in range(h) if any(alfa.getpixel((x, y)) > 127 for x in range(w))]
    # De baixo para cima: o ponto acaba onde aparece a primeira linha vazia.
    fundo = linhas[-1]
    topo = fundo
    while topo - 1 in linhas:
        topo -= 1
    return (topo + fundo + 1) / 2 / h


def vao_do_ponto(im):
    """As linhas vazias entre a ponta da gota e o ponto, em fracção da altura:
    é aí que a mira se corta em duas (CORTE_DO_PONTO no MapaGoogle.js)."""
    alfa = im.split()[3]
    w, h = im.size
    vazias = [y for y in range(int(h * 0.8), h) if not any(alfa.getpixel((x, y)) > 20 for x in range(w))]
    return (vazias[0] / h, (vazias[-1] + 1) / h) if vazias else None


def gravar(im, nome, tamanho):
    w, h = tamanho
    for sufixo, escala in (('', 1), ('@2x', 2), ('@3x', 3)):
        altura = h * escala
        largura = round(im.width * altura / im.height)
        reduzida = im.resize((largura, altura), Image.LANCZOS)
        tela = Image.new('RGBA', (w * escala, altura), (0, 0, 0, 0))
        tela.paste(reduzida, ((w * escala - largura) // 2, 0), reduzida)
        tela.save(os.path.join(DESTINO, f'{nome}{sufixo}.png'))
        if escala == 3:
            final = tela
    return final


def main():
    for nome, (ficheiro, tamanho, teal) in PINOS.items():
        im = gravar(arte(ficheiro, teal), nome, tamanho)
        vao = vao_do_ponto(im)
        vao = f'{vao[0]:.4f}–{vao[1]:.4f}' if vao else 'NENHUM: a ponta toca no ponto'
        print(f'{nome:22} {tamanho[0]}x{tamanho[1]}  ponto de baixo a {ponto_de_baixo(im):.4f}  vão {vao}')


if __name__ == '__main__':
    main()
