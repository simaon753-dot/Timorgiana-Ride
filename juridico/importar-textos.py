# O caminho de volta dos textos da app: lê o "Textos da App.docx" que o
# textos-app.mjs gera (e o Simão corrige) e põe o texto em mobile/src/i18n.
#
# Uso:
#   python3 importar-textos.py "app/Textos da App.docx"              mostra o que mudaria
#   python3 importar-textos.py --escrever "app/Textos da App.docx"   escreve na app
#   ... --destino OUTRA/PASTA                                         escreve noutra cópia
#
# SEM --escrever NÃO TOCA EM NADA: lista, texto a texto, o que o Word tem de
# diferente da app.
#
# UM TEXTO SÓ ENTRA SE CONTINUAR A FUNCIONAR: os marcadores ({nome}, {h}…)
# têm de ser os mesmos, e os ** aos pares. A app troca {nome} por um nome; um
# marcador apagado ou mal escrito deixava "{nme}" no ecrã, ou a frase sem o
# número que a explica. Esses ficam de fora, com aviso, e o resto entra.
#
# Sem dependências: um .docx é um zip com XML (o mesmo princípio do ler.py e
# do importar-termos.py). Texto apagado com o controlo de alterações não
# conta; texto inserido conta.
import json, re, subprocess, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
AQUI = Path(__file__).resolve().parent
LINGUAS = ['pt', 'tet', 'en']
MARCADOR = re.compile(r'\{[a-zA-Z]+\}')


def texto_do(el):
    partes = []
    for x in el.iter():
        if x.tag == W + 't':
            partes.append(x.text or '')
        elif x.tag == W + 'tab':
            partes.append('\t')
        elif x.tag in (W + 'br', W + 'cr'):
            partes.append('\n')
    return ''.join(partes)


def valor_da_celula(tc):
    linhas = []
    for p in tc.findall(W + 'p'):
        linhas.extend(texto_do(p).split('\n'))
    linhas = [l.rstrip() for l in linhas]
    while linhas and not linhas[0].strip():
        linhas.pop(0)
    while linhas and not linhas[-1].strip():
        linhas.pop()
    return '\n'.join(linhas)


def ler_docx(caminho):
    raiz = ET.fromstring(zipfile.ZipFile(caminho).read('word/document.xml'))
    corpo = raiz.find(W + 'body')
    nome = next((texto_do(p).strip() for p in corpo.findall(W + 'p') if texto_do(p).strip()), '')
    if nome != 'Textos da App':
        raise SystemExit(f'{caminho}: o primeiro parágrafo devia ser «Textos da App», e é «{nome}»')
    tbl = corpo.find(W + 'tbl')
    if tbl is None:
        raise SystemExit(f'{caminho}: não encontrei a tabela')
    doc = {}
    for n, tr in enumerate(tbl.findall(W + 'tr')):
        celulas = tr.findall(W + 'tc')
        if n == 0 or len(celulas) != 4:
            continue  # cabeçalho e títulos dos ecrãs
        chave = valor_da_celula(celulas[0]).strip()
        if not chave:
            continue
        doc[chave] = {l: valor_da_celula(c) for l, c in zip(LINGUAS, celulas[1:])}
    return doc


def atuais(pasta):
    js = f"""
import {{ pathToFileURL }} from 'node:url';
const d = {json.dumps(str(pasta))};
const out = {{}};
for (const l of ['pt', 'tet', 'en']) out[l] = (await import(pathToFileURL(d + '/' + l + '.js').href)).default;
console.log(JSON.stringify(out));
"""
    r = subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr)
    return json.loads(r.stdout)


def problema(novo, velho):
    if not novo.strip() and velho.strip():
        return 'ficou vazio'
    if sorted(MARCADOR.findall(novo)) != sorted(MARCADOR.findall(velho)):
        return f'marcadores diferentes: {sorted(set(MARCADOR.findall(velho)))} → {sorted(set(MARCADOR.findall(novo)))}'
    if novo.count('**') % 2:
        return 'os ** não estão aos pares'
    return None


def js(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n') + "'"


# Uma cadeia de JavaScript tal como o Prettier a deixa: entre plicas ou aspas,
# às vezes na linha de baixo, às vezes partida em pedaços unidos por +.
CADEIA = r"(?:'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\")"
VALOR = rf"(?:\s*\n\s*|\s+)(?:{CADEIA}\s*\+\s*\n\s*)*{CADEIA},"


def escrever(pasta, mudancas):
    for l in LINGUAS:
        so = {k: v for (k, lg), v in mudancas.items() if lg == l}
        if not so:
            continue
        f = pasta / f'{l}.js'
        s = f.read_text(encoding='utf-8')
        for k, v in so.items():
            r = re.compile(rf'^  {k}:{VALOR}$', re.M)
            if len(r.findall(s)) != 1:
                raise SystemExit(f'{f.name}: não encontrei «{k}» uma vez só — nada foi escrito neste ficheiro')
            s = r.sub(lambda m, k=k, v=v: f'  {k}: {js(v)},', s, count=1)
        f.write_text(s, encoding='utf-8')
        print(f'   ✓ {len(so)} texto(s) escrito(s) em {f}')


def main():
    args = sys.argv[1:]
    escreve = '--escrever' in args
    pasta = AQUI.parent / 'mobile' / 'src' / 'i18n'
    if '--destino' in args:
        pasta = Path(args[args.index('--destino') + 1]).resolve()
    ficheiros = [a for a in args if a.endswith('.docx')]
    if len(ficheiros) != 1:
        raise SystemExit('Indica o "Textos da App.docx".')
    doc = ler_docx(ficheiros[0])
    velho = atuais(pasta)

    mudancas, recusadas = {}, []
    desconhecidas = [k for k in doc if k not in velho['pt']]
    em_falta = [k for k in velho['pt'] if k not in doc]
    for k, vals in doc.items():
        if k not in velho['pt']:
            continue
        for l in LINGUAS:
            novo, antigo = vals[l], velho[l][k]
            if novo == antigo:
                continue
            p = problema(novo, antigo)
            if p:
                recusadas.append(f'{k} ({l}): {p}')
            else:
                mudancas[(k, l)] = novo

    print(f'── {len(mudancas)} texto(s) mudado(s)' if mudancas else '── sem alterações')
    for (k, l), v in mudancas.items():
        print(f'   · {k} ({l}): «{velho[l][k]}» → «{v}»')
    if recusadas:
        print(f'\n── {len(recusadas)} texto(s) que NÃO entram:')
        for x in recusadas:
            print('   ✗ ' + x)
    if desconhecidas:
        print(f'\n── {len(desconhecidas)} chave(s) no Word que a app não tem (ignoradas): ' + ', '.join(desconhecidas[:10]))
    if em_falta:
        print(f'\n── {len(em_falta)} chave(s) da app que não vieram no Word (ficam como estão): ' + ', '.join(em_falta[:10]))
    if escreve and mudancas:
        escrever(pasta, mudancas)
    elif mudancas:
        print('\n(Nada foi escrito. Para escrever na app: --escrever)')


if __name__ == '__main__':
    main()
