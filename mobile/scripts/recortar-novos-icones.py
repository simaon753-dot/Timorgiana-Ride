#!/usr/bin/env python3
"""Prepara os ícones novos do Simão (22/09/2026), gerados por IA.

ENTRADA  desenho/imagens/Novos ícones/  (fora do repositório)
SAÍDA    assets/icones/, assets/ilustracoes/, assets/mapa/

CADA ÍCONE VEIO EM DOIS FICHEIROS e usamos SÓ UM. O par «x.jpg» e
«x escura.jpg» é o mesmo desenho: o que muda é o fundo, branco num, preto no
outro. Com transparência, um ficheiro serve os dois temas da app — e no dia
em que houver um terceiro tema não há nada a gerar outra vez.

PORQUE ESCOLHEMOS SEMPRE O DE FUNDO PRETO, e é a decisão que faz isto
funcionar. Nestes desenhos as linhas interiores — as janelas do carro, as
jantes, o anel do centro da bússola — não são formas pintadas: são RECORTES,
da cor do fundo, por onde o fundo se vê. No ficheiro de fundo branco essas
linhas são brancas; no de fundo preto são pretas.

Se recortássemos só o fundo pelas bordas (como o recortar-ilustracoes.py faz,
e ali está certo), as linhas ficavam pintadas — um carro com jantes brancas
sobre um cartão claro, ou pretas sobre um escuro, e num dos casos
desaparecem. Por isso aqui **deita-se fora o preto em TODO o sítio**, fundo e
linhas ao mesmo tempo: sobra a arte em teal e coral, e as linhas passam a
deixar ver a superfície que estiver por baixo.

O limite é seguro porque o dark teal da marca é (14, 92, 84): tem o verde bem
acima de 45, e nenhuma cor da arte se aproxima do preto. O branco fica — e
tem de ficar, que é o ponto do pino (o círculo do meio é branco de propósito).

Correr:  python3 scripts/recortar-novos-icones.py
Precisa: Pillow
"""

import os

from PIL import Image, ImageFilter

# Abaixo disto em TODOS os canais é fundo ou linha de recorte, não arte.
LIMITE_PRETO = 45

# nome de saída -> (ficheiro de origem, pasta, largura em pontos)
#
# As larguras são as dos ficheiros que já lá estavam, para nada mudar de
# tamanho no ecrã por causa desta troca: os veículos a 64, as ilustruções da
# barra de baixo a 48, os pinos a 30 e os botões do mapa a 24 (que é o
# tamanho a que o Icone.js os desenha).
ICONES = {
    # ── a barra de baixo, e o perfil na barra de cima ──
    'inicio': ('início escura.jpg', 'ilustracoes', 48),
    'viagens': ('viagem escura.jpg', 'ilustracoes', 48),
    'rendimento': ('trabalho escura.jpg', 'ilustracoes', 48),
    'perfil': ('perfil escura.jpg', 'ilustracoes', 48),
    # ── os pinos do mapa ──
    'pino-origem': ('pino de recolha.jpg', 'mapa', 30),
    'pino-destino': ('pino de destino.jpg', 'mapa', 30),
}

# OS VEÍCULOS NÃO PASSAM POR AQUI, e é o sítio certo para dizer porquê.
#
# O selector de veículo já mostra uma FOTOGRAFIA por tema
# (`assets/veiculos/<tipo>-<claro|escuro>.jpg`, 624 × 416), num quadrado
# branco de dia e preto de noite. Os pares que o Simão gerou são exactamente
# isso — e é por isso que ele os gerou aos pares.
#
# Portanto aqui não se recorta nada: reduz-se e grava-se o par. Recortar o
# fundo seria desfazer o desenho, porque nestes o fundo é a moldura.
#
# ATENÇÃO AOS NOMES DELE, que estão ao contrário: «arro escura.jpg» é o de
# fundo BRANCO (vai para `-claro`) e «arro branco.jpg» é o de fundo PRETO
# (vai para `-escuro`). Não se segue o nome — mede-se o canto.
VEICULOS = {
    'mota': ('motorizasa escura.jpg', 'motorizada branco.jpg'),
    'carro': ('arro escura.jpg', 'arro branco.jpg'),
    'carry': ('pickup escura.jpg', 'Pickup branco.jpg'),
}
VEICULO_LARGURA = 624

# OS QUE FICARAM DE FORA, e a razão, para não se voltar a tentar às cegas.
#
# A bússola, o satélite, as flores e a encomenda são desenhos bonitos e
# ILEGÍVEIS ao tamanho a que a app os usa (18 a 22 pontos): a bússola tem as
# letras N/S/E/O, que a essa escala ficam com quatro pixéis de altura; o
# satélite tem textura fotográfica, que vira ruído; o ramo tem cinco flores
# e sete folhas; a encomenda saiu a 24 × 14, larga e baixa demais.
#
# E há um impedimento à parte, que nenhuma arte resolve: os botões do
# satélite e do «seguir» ACENDEM a teal quando activos, com o ícone a
# branco. Um ícone que já é teal desaparece em cima de teal — só um traço
# que a app pinta consegue mudar de cor com o estado.
#
# Ficam os SVG do Icone.js. Para estes quatro darem, a arte tem de vir sem
# letras, com menos peças e com traços mais grossos.
FORA = ('bússola', 'satélite', 'flores', 'encomenda', 'seguir')


def sem_preto(caminho):
    """Deita fora o preto — fundo e linhas de recorte — e corta à arte."""
    im = Image.open(caminho).convert('RGB')
    w, h = im.size
    px = im.load()
    alfa = Image.new('L', (w, h), 0)
    ap = alfa.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            ap[x, y] = 0 if (r < LIMITE_PRETO and g < LIMITE_PRETO and b < LIMITE_PRETO) else 255
    # O JPEG deixa um halo de pixéis intermédios em cada bordo. Sem isto, o
    # ícone fica serrilhado; com mais do que isto, come a arte.
    alfa = alfa.filter(ImageFilter.GaussianBlur(0.8))
    fora = im.convert('RGBA')
    fora.putalpha(alfa)
    caixa = alfa.getbbox()
    return fora.crop(caixa) if caixa else fora


def gravar(imagem, pasta, nome, largura):
    altura = max(1, round(largura * imagem.height / imagem.width))
    for sufixo, escala in (('', 1), ('@2x', 2), ('@3x', 3)):
        alvo = imagem.resize((largura * escala, altura * escala), Image.LANCZOS)
        alvo.save(os.path.join(pasta, f'{nome}{sufixo}.png'))
    return largura, altura


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    origem = os.path.abspath(
        os.path.join(aqui, '..', '..', 'desenho', 'imagens', 'Novos ícones')
    )
    if not os.path.isdir(origem):
        raise SystemExit(f'falta a pasta: {origem}')

    for nome, (ficheiro, pasta, largura) in ICONES.items():
        caminho = os.path.join(origem, ficheiro)
        if not os.path.exists(caminho):
            raise SystemExit(f'falta o ficheiro: {caminho}')
        destino = os.path.join(aqui, '..', 'assets', pasta)
        os.makedirs(destino, exist_ok=True)
        l, a = gravar(sem_preto(caminho), destino, nome, largura)
        print(f'{nome:20} {l:3}x{a:<3}  {pasta}/  <- {ficheiro}')

    # Os veículos: reduzir e gravar o par, sem tocar no fundo.
    destino = os.path.join(aqui, '..', 'assets', 'veiculos')
    os.makedirs(destino, exist_ok=True)
    for tipo, (claro, escuro) in VEICULOS.items():
        for sufixo, ficheiro in (('claro', claro), ('escuro', escuro)):
            caminho = os.path.join(origem, ficheiro)
            if not os.path.exists(caminho):
                raise SystemExit(f'falta o ficheiro: {caminho}')
            im = Image.open(caminho).convert('RGB')
            altura = round(VEICULO_LARGURA * im.height / im.width)
            im = im.resize((VEICULO_LARGURA, altura), Image.LANCZOS)
            im.save(os.path.join(destino, f'{tipo}-{sufixo}.jpg'), quality=88)
            print(f'{tipo + "-" + sufixo:20} {im.width}x{im.height}  veiculos/  <- {ficheiro}')

    print('\nDe fora, por serem ilegíveis ao tamanho usado: ' + ', '.join(FORA))


if __name__ == '__main__':
    main()
