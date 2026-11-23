"""Gera as páginas internas a partir da index.html.

A index.html é a fonte do <head>, do menu, do menu em tela cheia, do rodapé,
da faixa inferior, do popup e do formulário. Cada página só define o conteúdo
em tools/pages/<nome>.html (com título e descrição nos comentários do topo).

Uso: python tools/build_pages.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ['solucoes', 'servicos', 'clientes', 'contato']

home = (ROOT / 'index.html').read_text(encoding='utf-8')

head = home[:home.index('</head>')]
top = home[home.index('  <a class="skip"'):home.index('  <!-- Palco fixo')]
tail = home[home.index('  <footer class="foot"'):]
tail = tail.replace('  <script src="js/main.js"></script>\n', '')


def build(name):
    frag = (ROOT / 'tools' / 'pages' / f'{name}.html').read_text(encoding='utf-8')
    title = re.search(r'<!-- title: (.*?) -->', frag).group(1)
    desc = re.search(r'<!-- description: (.*?) -->', frag).group(1)
    body = re.sub(r'<!-- (title|description): .*? -->\n', '', frag)

    h = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', head)
    h = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + desc, h)
    h = re.sub(r'(<meta property="og:title" content=")[^"]*', lambda m: m.group(1) + title, h)
    h = re.sub(r'(<meta property="og:description" content=")[^"]*', lambda m: m.group(1) + desc, h)

    t = top.replace(f'href="{name}.html"', f'href="{name}.html" aria-current="page"')
    return (h + '</head>\n'
            f'<body class="page" data-page="{name}">\n'
            + t
            + '  <main id="conteudo">\n'
            + body
            + '  </main>\n\n'
            + tail)


for p in PAGES:
    (ROOT / f'{p}.html').write_text(build(p), encoding='utf-8', newline='\n')
    print('gerada', f'{p}.html')
