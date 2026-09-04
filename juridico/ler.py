# Lê um .docx sem LibreOffice: um .docx é um zip com XML lá dentro.
# Serve para confirmar o CONTEÚDO e a ESTRUTURA — não o desenho da página.
import sys, zipfile, re
from xml.etree import ElementTree as ET
W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
z=zipfile.ZipFile(sys.argv[1])
raiz=ET.fromstring(z.read('word/document.xml'))
def texto(el): return ''.join(t.text or '' for t in el.iter(W+'t'))
corpo=raiz.find(W+'body')
n_par=n_tab=0
for el in corpo:
    if el.tag==W+'p':
        t=texto(el).strip()
        if not t: continue
        n_par+=1
        estilo=el.find(f'{W}pPr/{W}pStyle')
        num=el.find(f'{W}pPr/{W}numPr')
        marca='  •' if num is not None else ('##' if estilo is not None else '  ')
        print(f'{marca} {t}')
    elif el.tag==W+'tbl':
        n_tab+=1
        linhas=el.findall(W+'tr')
        print(f'  ┌─ TABELA {n_tab}: {len(linhas)} linhas × {len(linhas[0].findall(W+"tc"))} colunas')
        for tr in linhas[:3]:
            print('  │  ' + ' | '.join(texto(tc).strip()[:34] for tc in tr.findall(W+'tc')))
        if len(linhas)>3: print(f'  └─ (+{len(linhas)-3} linhas)')
        else: print('  └─')
print(f'\n  ── {n_par} parágrafos, {n_tab} tabela(s) ──')
