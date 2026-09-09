#!/usr/bin/env python3
"""Prepara as capturas de ecrã do telemóvel para a ficha do Google Play.

PORQUE EXISTE. A loja impõe uma regra que quase nenhum telemóvel de hoje
cumpre:

    "The maximum dimension of your screenshot can't be more than twice as
     long as the minimum dimension."

Um Android normal fotografa o ecrã a 1080x2400 — proporção 2,22:1. Passa do
limite, e a loja recusa o ficheiro sem explicar porquê. O mesmo acontece com
1080x2340 e com 720x1600.

O QUE FAZ. Alarga a tela em vez de cortar a imagem. A captura fica inteira,
centrada, com duas barras da cor da marca aos lados até a proporção chegar a
9:16 — que é a medida certa e, ainda por cima, a que a Google exige para uma
app poder aparecer nas secções de destaque.

PORQUE NÃO CORTA. Cortar era o caminho óbvio e é o errado: o que ficaria de
fora é o cimo e o fundo do ecrã, que é precisamente onde a app põe o preço e
o botão. Uma captura cortada a régua estraga a única imagem que a maioria das
pessoas vê antes de decidir se instala. Alargar não perde nada e não precisa
de reamostrar um único pixel — a captura sai da tela com a nitidez com que
entrou.

USAR
    1. Tirar as fotografias no telemóvel (ligar + baixar volume).
    2. Passá-las para  loja/capturas-originais/  com nomes que ordenem pela
       ordem que quer na loja:  1-mapa.png, 2-veiculo.png, ...
    3. python3 loja/capturas.py
    4. Enviar para a loja o que sair em  loja/capturas/

Precisa: Pillow
"""

import os
import sys

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEM = os.path.join(AQUI, 'capturas-originais')
DESTINO = os.path.join(AQUI, 'capturas')

TEAL = (14, 92, 84)

# Os limites da loja, em pixéis.
MIN_LADO = 320
MAX_LADO = 3840
# A proporção do lado maior para o menor. A loja diz "no more than twice".
MAX_PROPORCAO = 2.0
# 9:16 — a forma para que alargamos, e o mínimo para os destaques da loja.
ALTURA_POR_LARGURA = 16 / 9

EXTENSOES = ('.png', '.jpg', '.jpeg', '.webp')


def enquadrar(img):
    """Devolve a imagem centrada numa tela que a loja aceite.

    Só alarga; nunca corta. Se a captura já estiver dentro dos limites, sai
    igual — não há reamostragem nenhuma no caminho normal.
    """
    l, a = img.size

    # Reduzir só se algum lado passar do tecto. Raro: nenhum telemóvel
    # fotografa acima de 3840, mas um tablet em paisagem pode lá chegar.
    if max(l, a) > MAX_LADO:
        escala = MAX_LADO / max(l, a)
        l, a = round(l * escala), round(a * escala)
        img = img.resize((l, a), Image.LANCZOS)

    tela_l, tela_a = l, a

    # Comprida de mais (o caso de todos os telemóveis): alargar até 9:16.
    if a / l > MAX_PROPORCAO:
        tela_l = round(a / ALTURA_POR_LARGURA)
    # Larga de mais (paisagem, ou um tablet): subir até 16:9.
    elif l / a > MAX_PROPORCAO:
        tela_a = round(l / ALTURA_POR_LARGURA)

    # E, no fim, garantir o chão de 320. Uma captura de um telemóvel antigo
    # pode ter o lado curto abaixo disto depois de nada lhe ter sido feito.
    if min(tela_l, tela_a) < MIN_LADO:
        escala = MIN_LADO / min(tela_l, tela_a)
        novo_l, novo_a = round(l * escala), round(a * escala)
        img = img.resize((novo_l, novo_a), Image.LANCZOS)
        l, a = novo_l, novo_a
        tela_l, tela_a = round(tela_l * escala), round(tela_a * escala)

    if (tela_l, tela_a) == (l, a):
        return img, False

    # A loja não aceita transparência: a tela é opaca de propósito.
    tela = Image.new('RGB', (tela_l, tela_a), TEAL)
    tela.paste(img, ((tela_l - l) // 2, (tela_a - a) // 2))
    return tela, True


def destacavel(img):
    """Se cumpre o que a Google pede para as secções de destaque: 9:16 (ou
    16:9) com o lado curto a 1080 ou mais."""
    l, a = img.size
    curto, comprido = min(l, a), max(l, a)
    return curto >= 1080 and abs(comprido / curto - ALTURA_POR_LARGURA) < 0.01


def main():
    if not os.path.isdir(ORIGEM):
        os.makedirs(ORIGEM)
    ficheiros = sorted(
        f for f in os.listdir(ORIGEM)
        if f.lower().endswith(EXTENSOES) and not f.startswith('.')
    )

    if not ficheiros:
        print(f'Sem capturas em {os.path.relpath(ORIGEM)}/')
        print('Ponha lá as fotografias do telemóvel e corra outra vez.')
        return 1

    os.makedirs(DESTINO, exist_ok=True)
    for antigo in os.listdir(DESTINO):
        if antigo.lower().endswith('.png'):
            os.remove(os.path.join(DESTINO, antigo))

    contagem_destaque = 0
    for i, nome in enumerate(ficheiros, start=1):
        img = Image.open(os.path.join(ORIGEM, nome)).convert('RGB')
        antes = img.size
        img, alargada = enquadrar(img)
        saida = f'{i:02d}.png'
        img.save(os.path.join(DESTINO, saida))

        marca = '✓' if destacavel(img) else ' '
        if destacavel(img):
            contagem_destaque += 1
        nota = 'alargada' if alargada else 'sem mudança'
        print(f'{marca} {saida}  {antes[0]}x{antes[1]} → '
              f'{img.size[0]}x{img.size[1]}  ({nota})  {nome}')

    print()
    n = len(ficheiros)
    if n < 2:
        print(f'FALTA: {n} captura. A loja não publica com menos de 2.')
    elif n < 4:
        print(f'{n} capturas — chega para publicar.')
        print('Com 4 ou mais, a app fica elegível para as secções de destaque.')
    else:
        print(f'{n} capturas — chega para publicar e para os destaques.')

    faltam = n - contagem_destaque
    if faltam:
        print(f'{faltam} não {"chega" if faltam == 1 else "chegam"} a 1080 no '
              f'lado curto: {"conta" if faltam == 1 else "contam"} para '
              'publicar, não para os destaques.')
    print(f'\nProntas em {os.path.relpath(DESTINO)}/')
    return 0


if __name__ == '__main__':
    sys.exit(main())
