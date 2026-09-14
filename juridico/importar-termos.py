# O caminho de volta: lê os Word que o termos-app.mjs gera (e o Simão
# corrige) e põe o texto na app, em mobile/src/termos.
#
# Uso:
#   python3 importar-termos.py app/*.docx              mostra o que mudaria
#   python3 importar-termos.py --escrever app/*.docx   escreve na app
#   ... --destino OUTRA/PASTA                          escreve noutra cópia
#
# SEM --escrever NÃO TOCA EM NADA: lista, cláusula a cláusula, o que o Word
# tem de diferente da app. É o que se lê antes de publicar um texto legal.
#
# O QUE MUDA E O QUE NÃO MUDA na app: só os valores dos dados do documento
# (titulo, subtitulo, atualizado, aceitarCurto) e a lista das cláusulas. Os
# comentários e qualquer outro campo do objecto ficam onde estão. A VERSÃO
# (termos/versao.js) não é mexida aqui — mudar a versão obriga toda a gente a
# aceitar outra vez, e isso é uma decisão, não um efeito de importar.
#
# Sem dependências: um .docx é um zip com XML (o mesmo princípio do ler.py).
# Texto apagado com o controlo de alterações (w:delText) não conta; texto
# inserido conta — ou seja, lê o documento como ficaria com as alterações
# aceites.
import json, re, subprocess, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
AQUI = Path(__file__).resolve().parent
LINGUAS = ['pt', 'tet', 'en']
CAMPOS = {'▸ TÍTULO': 'titulo', '▸ SUBTÍTULO': 'subtitulo', '▸ DATA': 'atualizado', '▸ CAIXA': 'aceitarCurto'}
# Nome do documento → onde vive na app.
DESTINOS = {
    'Termos do Passageiro': ('termos', 'termosPassageiro'),
    'Termos do Motorista': ('termos', 'termosMotorista'),
    'Aviso de Privacidade': ('privacidade', None),
}


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


def linhas_da_celula(tc):
    linhas = []
    for p in tc.findall(W + 'p'):
        linhas.extend(texto_do(p).split('\n'))
    linhas = [l.rstrip() for l in linhas]
    return linhas


def aparar(linhas):
    while linhas and not linhas[0].strip():
        linhas.pop(0)
    while linhas and not linhas[-1].strip():
        linhas.pop()
    return linhas


def ler_docx(caminho):
    raiz = ET.fromstring(zipfile.ZipFile(caminho).read('word/document.xml'))
    corpo = raiz.find(W + 'body')
    nome = next((texto_do(p).strip() for p in corpo.findall(W + 'p') if texto_do(p).strip()), '')
    if nome not in DESTINOS:
        raise SystemExit(f'{caminho}: o primeiro parágrafo devia ser o nome do documento, e é «{nome}»')
    tbl = corpo.find(W + 'tbl')
    if tbl is None:
        raise SystemExit(f'{caminho}: não encontrei a tabela')
    doc = {l: {'seccoes': []} for l in LINGUAS}
    for n, tr in enumerate(tbl.findall(W + 'tr')):
        if n == 0:
            continue  # cabeçalho das línguas
        celulas = tr.findall(W + 'tc')
        if len(celulas) != 3:
            raise SystemExit(f'{caminho}: a linha {n + 1} da tabela tem {len(celulas)} colunas, e não 3')
        conteudos = [aparar(linhas_da_celula(tc)) for tc in celulas]
        if not any(conteudos):
            continue  # linha nova deixada em branco
        rotulo = next((c[0] for c in conteudos if c), '')
        campo = next((k for pref, k in CAMPOS.items() if rotulo.startswith(pref)), None)
        for l, c in zip(LINGUAS, conteudos):
            if campo:
                doc[l][campo] = '\n'.join(aparar(c[1:])).strip()
            else:
                if not c:
                    raise SystemExit(f'{caminho}: a cláusula da linha {n + 1} está vazia em {l}')
                doc[l]['seccoes'].append({'titulo': c[0].strip(), 'texto': '\n'.join(aparar(c[1:]))})
    return nome, doc


def atuais(pasta):
    """O texto que a app tem agora, lido pelo próprio JavaScript."""
    js = f"""
import {{ pathToFileURL }} from 'node:url';
const d = {json.dumps(str(pasta))};
const u = (f) => pathToFileURL(d + '/' + f).href;
const out = {{}};
for (const l of ['pt', 'tet', 'en']) {{
  const m = await import(u(l + '.js'));
  out['Termos do Passageiro/' + l] = m.termosPassageiro;
  out['Termos do Motorista/' + l] = m.termosMotorista;
}}
const p = await import(u('privacidade.js'));
for (const l of ['pt', 'tet', 'en']) out['Aviso de Privacidade/' + l] = p.textoPrivacidade(l);
console.log(JSON.stringify(out));
"""
    r = subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr)
    return json.loads(r.stdout)


def diferencas(nome, novo, velho):
    d = []
    for l in LINGUAS:
        for k in ('titulo', 'subtitulo', 'atualizado', 'aceitarCurto'):
            if k in novo[l] and novo[l][k] != velho[l].get(k):
                d.append(f'{nome} ({l}): {k}')
        ns, vs = novo[l]['seccoes'], velho[l]['seccoes']
        if len(ns) != len(vs):
            d.append(f'{nome} ({l}): {len(vs)} → {len(ns)} cláusulas')
        for i in range(max(len(ns), len(vs))):
            a = vs[i] if i < len(vs) else None
            b = ns[i] if i < len(ns) else None
            if a != b:
                t = (b or a)['titulo']
                d.append(f'{nome} ({l}): cláusula {i + 1} «{t}» ' + ('nova' if a is None else 'retirada' if b is None else 'alterada'))
    return d


def js(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n') + "'"


# Uma cadeia de JavaScript tal como o Prettier a deixa: entre plicas ou aspas,
# às vezes na linha de baixo, às vezes partida em pedaços unidos por +.
CADEIA = r"(?:'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\")"
VALOR = rf"(?:\s*\n\s*|\s+)(?:{CADEIA}\s*\+\s*\n\s*)*{CADEIA},"


def trocar_objecto(bloco, dados, onde):
    for k in ('titulo', 'subtitulo', 'atualizado', 'aceitarCurto'):
        if k not in dados:
            continue
        r = re.compile(rf'^  {k}:{VALOR}$', re.M)
        if len(r.findall(bloco)) != 1:
            raise SystemExit(f'{onde}: não encontrei o campo {k} uma vez só')
        bloco = r.sub(lambda m: f'  {k}: {js(dados[k])},', bloco, count=1)
    r = re.compile(r'^  seccoes: \[\n.*?^  \],\n', re.M | re.S)
    if len(r.findall(bloco)) != 1:
        raise SystemExit(f'{onde}: não encontrei a lista das cláusulas')
    novas = ''.join(
        f"    {{\n      titulo: {js(s['titulo'])},\n      texto:\n        {js(s['texto'])},\n    }},\n"
        for s in dados['seccoes']
    )
    return r.sub(lambda m: '  seccoes: [\n' + novas + '  ],\n', bloco, count=1)


def escrever(pasta, nome, doc):
    tipo, objecto = DESTINOS[nome]
    for l in LINGUAS:
        ficheiro = pasta / (f'{l}.js' if tipo == 'termos' else 'privacidade.js')
        s = ficheiro.read_text(encoding='utf-8')
        inicio = f'export const {objecto} = {{\n' if tipo == 'termos' else f'const {l} = {{\n'
        i = s.find(inicio)
        j = s.find('\n};\n', i)
        if i < 0 or j < 0:
            raise SystemExit(f'{ficheiro}: não encontrei «{inicio.strip()}»')
        s = s[:i] + trocar_objecto(s[i:j + 1], doc[l], f'{ficheiro.name} {objecto or l}') + s[j + 1:]
        ficheiro.write_text(s, encoding='utf-8')


def main():
    args = sys.argv[1:]
    escreve = '--escrever' in args
    pasta = AQUI.parent / 'mobile' / 'src' / 'termos'
    if '--destino' in args:
        pasta = Path(args[args.index('--destino') + 1]).resolve()
    ficheiros = [a for a in args if a.endswith('.docx')]
    if not ficheiros:
        raise SystemExit(__doc__ or 'Indica os .docx a importar.')
    velhos = atuais(pasta)
    total = 0
    for f in ficheiros:
        nome, doc = ler_docx(f)
        velho = {l: velhos[f'{nome}/{l}'] for l in LINGUAS}
        for l in LINGUAS:
            if len(doc[l]['seccoes']) != len(doc['pt']['seccoes']):
                raise SystemExit(f'{f}: {l} ficou com um número de cláusulas diferente do português')
        d = diferencas(nome, doc, velho)
        total += len(d)
        print(f'── {nome}: ' + (f'{len(d)} diferença(s)' if d else 'sem alterações'))
        for x in d:
            print('   · ' + x)
        if escreve and d:
            escrever(pasta, nome, doc)
            print(f'   ✓ escrito em {pasta}')
    if total and not escreve:
        print('\n(Nada foi escrito. Para escrever na app: --escrever)')


if __name__ == '__main__':
    main()
