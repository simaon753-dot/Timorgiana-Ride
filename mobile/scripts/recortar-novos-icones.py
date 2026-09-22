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

import colorsys
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
    # A PASTA É O LUGAR «TRABALHO», NÃO O SEPARADOR «GANHOS» (22/09/2026).
    #
    # Pus-a nos Ganhos à primeira e estava errado: o separador tinha notas de
    # dinheiro, e ganhos SÃO dinheiro — uma pasta de trabalho diz outra coisa.
    # As notas voltaram ao sítio.
    #
    # Casa e Trabalho são os dois lugares guardados do ecrã de destino, e até
    # hoje eram os emojis 🏠 e 💼 — o último reduto de emojis da app, contra
    # o que o próprio Icone.js manda.
    'trabalho': ('trabalho escura.jpg', 'ilustracoes', 48),
    'perfil': ('perfil escura.jpg', 'ilustracoes', 48),
    # ── os quatro botões do mapa, e os dois serviços ──
    #
    # A PRIMEIRA TENTATIVA FALHOU POR TAMANHO, não por desenho (22/09/2026):
    # gerei-os a 24 e o Simão via um borrão, porque a app desenhava-os a 18 e
    # 22 pontos dentro de pastilhas de 34 e 40. A correcção não foi arranjar
    # arte nova — foi dar-lhes o espaço que a pastilha já tinha.
    # A BÚSSOLA VAI SÓ COM A AGULHA. O desenho traz as letras N/O/E/S à
    # volta, e elas têm outra escala: a 26 pontos ficam com cinco pixéis e
    # viram ruído em cima da agulha, que se lê bem. Ampliar não as salvava —
    # só aumentava o ruído. A agulha sozinha É a bússola: é ela que diz para
    # onde é o norte. O 0.56 é a fatia do meio que fica.
    'botao-bussola': ('bússola escura.jpg', 'icones', 26, 0.56),
    'botao-mim': ('botão para voltar a minha localização escura.jpg', 'icones', 26),
    'botao-satelite': ('botão muda para satelite escura.jpg', 'icones', 26),
    'botao-seguir': ('movimento escura.jpg', 'icones', 26),
    'servico-flores': ('flores escura.jpg', 'icones', 30),
    'servico-encomenda': ('ncomenda escura.jpg', 'icones', 30),
    # ── os pinos do mapa ──
    # 46 (22/09/2026, pedido do Simão, afinado a olho em três passos: 30 → 42
    # → 54 → 46). Os 30 do princípio perdiam-se no meio dos nomes que o Google
    # desenha por baixo; os 54 mandavam de mais. Quarenta e seis é onde ele
    # parou. Os pinos de 30 pontos
    # perdiam-se no meio dos nomes e dos ícones que o Google desenha por
    # baixo. Quarenta por cento maiores, que é o que os põe a mandar na
    # imagem sem taparem a rua.
    'pino-origem': ('novo pino recolha.jpeg', 'mapa', 46),
    'pino-destino': ('Novo pino destino.jpeg', 'mapa', 46),
    # OS PINOS PEQUENOS, para as paragens ALTERNATIVAS (22/09/2026).
    #
    # Eram um círculo cinzento igual para os dois lados. O Simão pediu um
    # pino pequeno — e assim a alternativa fica da mesma família e da mesma
    # COR do ponto a que pertence: teal se é outra forma de ser recolhido,
    # coral se é outra forma de ser largado. Um círculo cinzento não dizia a
    # qual dos dois pontos se referia.
    #
    # 26 e não 46: tem de se ler como «também aqui», não como «é aqui».
    'pino-origem-pequeno': ('novo pino recolha.jpeg', 'mapa', 26),
    'pino-destino-pequeno': ('Novo pino destino.jpeg', 'mapa', 26),
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

# TUDO ENTROU, À SEGUNDA (22/09/2026).
#
# À primeira deixei quatro de fora — bússola, satélite, flores e encomenda —
# por os ver ilegíveis. Estava certo no diagnóstico e errado na conclusão: o
# problema era eu os ter gerado ao tamanho dos SVG que substituem (18 a 22
# pontos), quando as pastilhas onde vivem têm 34 e 40. A 26 e 30 lêem-se.
#
# A lição, que vale para o próximo lote: um traço fino aguenta ser pequeno;
# uma ilustração a cores, com partes, não. Antes de decidir que uma arte não
# serve, dar-lhe o espaço que a moldura já tem — e OLHAR, com uma folha de
# contacto ao tamanho real, em fundo claro e escuro.
#
# Duas mudanças no código tiveram de acompanhar:
#   · a bússola vai só com a agulha (ver o `0.56` acima);
#   · os botões do satélite e do «seguir» acendiam a teal CHEIO com o ícone a
#     branco, o que engolia arte a cores. Passaram a acender em tinta, com o
#     contorno teal.


# O TEAL DA MARCA, E NÃO O QUE A IA ESCOLHEU (22/09/2026).
#
# Os desenhos vieram num turquesa vivo (#08B0B8) com um segundo tom mais
# escuro (#007880). A marca é #0E5C54 — mais escuro e mais verde. Lado a lado
# com o resto da app, os ícones saltavam à vista por estarem fora da paleta.
#
# NÃO SE PINTA TUDO DE UMA COR SÓ. Os desenhos usam dois tons de teal para dar
# profundidade — o telhado claro e a parede escura da casa, o mostrador e os
# ponteiros do relógio. Achatá-los numa cor faria perder o desenho.
#
# O que se faz é mudar a MATIZ e a SATURAÇÃO para as da marca e reduzir a
# luminosidade na mesma proporção. O tom claro cai exactamente em #0E5C54 e o
# escuro acompanha, mais escuro na mesma medida: a relação entre os dois
# mantém-se e o conjunto passa a ser da casa.
#
# O CORAL FICA. Ele só falou do teal, e o coral dos desenhos já está à
# distância de um cabelo do da marca.
# ESCOLHIDO PELO SIMÃO A 22/09/2026, e é a única das três que se lê em toda
# a parte. Medi o contraste das candidatas contra os três fundos da app:
#
#                        papel claro   papel escuro   disco branco
#   deep teal  #0E5C54       7,1:1         2,0:1          7,8:1
#   bright teal #01F9C6      1,2:1        11,6:1          1,4:1
#   ESTE       #529C7F       3,0:1         4,9:1          3,3:1
#
# (o mínimo para um ícone se ler é 3,0:1)
#
# O teal profundo desaparecia no tema escuro; o bright teal desaparecia no
# claro — tem quase a mesma luminosidade do papel creme da app, e é por isso
# que parecia certo sobre o fundo PRETO dos desenhos originais. Este fica a
# meio e passa nos três, que é o que se pede a uma cor que tem de servir um
# ficheiro só.
TEAL_MARCA = (0x52, 0x9C, 0x7F)
# A luminosidade do tom claro que veio nos desenhos (#08B0B8). É a régua: o
# tom claro de cada desenho passa a ser exactamente a cor escolhida, e o
# escuro acompanha na mesma proporção.
L_ORIGEM_CLARA = 0.3765


def _teal(r, g, b):
    """O pixel pertence à família do teal? Verde e azul bem acima do vermelho,
    e os dois próximos um do outro — é isso que distingue um teal de um verde
    de parque ou de um azul de água."""
    return g > r + 40 and b > r + 40 and abs(g - b) < max(40, 0.35 * max(g, b))


def para_o_teal_da_marca(im):
    h_alvo, l_alvo, s_alvo = colorsys.rgb_to_hls(*[c / 255 for c in TEAL_MARCA])
    escala = l_alvo / L_ORIGEM_CLARA
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or not _teal(r, g, b):
                continue
            _, l, _ = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            nr, ng, nb = colorsys.hls_to_rgb(h_alvo, min(1, l * escala), s_alvo)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return im


def sem_preto(caminho, miolo=None):
    """Deita fora o preto — fundo e linhas de recorte — e corta à arte.

    Com `miolo`, fica só essa fracção central da imagem antes de tudo o
    resto: serve para deitar fora o que está à volta e tem outra escala.
    """
    im = Image.open(caminho).convert('RGB')
    if miolo:
        w0, h0 = im.size
        cw, ch = round(w0 * miolo), round(h0 * miolo)
        im = im.crop(((w0 - cw) // 2, (h0 - ch) // 2, (w0 + cw) // 2, (h0 + ch) // 2))
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
    return para_o_teal_da_marca(fora.crop(caixa) if caixa else fora)


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

    for nome, valores in ICONES.items():
        ficheiro, pasta, largura = valores[:3]
        miolo = valores[3] if len(valores) > 3 else None
        caminho = os.path.join(origem, ficheiro)
        if not os.path.exists(caminho):
            raise SystemExit(f'falta o ficheiro: {caminho}')
        destino = os.path.join(aqui, '..', 'assets', pasta)
        os.makedirs(destino, exist_ok=True)
        l, a = gravar(sem_preto(caminho, miolo), destino, nome, largura)
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



if __name__ == '__main__':
    main()
