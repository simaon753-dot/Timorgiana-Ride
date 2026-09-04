# Verifica um .pptx sem LibreOffice.
#
# Não substitui olhar para os slides — mas apanha as duas coisas que mais
# estragam uma apresentação e que se detectam sem os desenhar: elementos
# fora dos limites do slide, e texto a mais para a caixa que o contém.
import sys, zipfile, re
from xml.etree import ElementTree as ET

A='{http://schemas.openxmlformats.org/drawingml/2006/main}'
P='{http://schemas.openxmlformats.org/presentationml/2006/main}'
EMU=914400.0
LARG, ALT = 13.333, 7.5

z=zipfile.ZipFile(sys.argv[1])
mau=z.testzip()
slides=sorted([n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$',n)],
              key=lambda n:int(re.search(r'(\d+)',n.split('/')[-1]).group(1)))
print(f"  zip íntegro: {'sim' if mau is None else 'NÃO'} · {len(slides)} slides\n")

problemas=[]
for i,nome in enumerate(slides,1):
    raiz=ET.fromstring(z.read(nome))
    textos=[]
    for sp in raiz.iter():
        if not sp.tag.endswith('}sp') and not sp.tag.endswith('}pic'): continue
        xfrm=sp.find(f'.//{A}xfrm')
        if xfrm is None: continue
        off=xfrm.find(f'{A}off'); ext=xfrm.find(f'{A}ext')
        if off is None or ext is None: continue
        x=int(off.get('x'))/EMU; y=int(off.get('y'))/EMU
        w=int(ext.get('cx'))/EMU; h=int(ext.get('cy'))/EMU
        t=''.join(e.text or '' for e in sp.iter(f'{A}t')).strip()
        if x<-0.01 or y<-0.01 or x+w>LARG+0.01 or y+h>ALT+0.01:
            problemas.append(f"slide {i}: elemento FORA dos limites "
                             f"({x:.2f},{y:.2f} {w:.2f}×{h:.2f})  «{t[:36]}»")
        # estimativa grosseira de caber: largura média de caractere ≈ 0.5×corpo
        if t:
            rpr=sp.find(f'.//{A}rPr')
            sz=int(rpr.get('sz'))/100 if rpr is not None and rpr.get('sz') else 14
            linhas_cabem = max(1, int(h/(sz*1.25/72)))
            chars_linha  = max(1, int(w/(sz*0.50/72)))
            if len(t) > linhas_cabem*chars_linha*1.05:
                problemas.append(f"slide {i}: texto pode NÃO CABER "
                                 f"({len(t)} car. em {linhas_cabem}×{chars_linha}) «{t[:36]}»")
        if t: textos.append(t)
    print(f"  ── slide {i} ──")
    for t in textos[:3]: print(f"     {t[:78]}")
    if len(textos)>3: print(f"     (+{len(textos)-3} blocos)")

print()
if problemas:
    print(f"  ⚠ {len(problemas)} aviso(s):")
    for p in problemas: print('    '+p)
else:
    print("  ✓ nada fora dos limites, nada visivelmente a transbordar")
