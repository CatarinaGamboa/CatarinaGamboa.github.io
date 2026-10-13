# Usage (from repo root): python3 -I .claude/skills/paper-page/scripts/make_page.py <main.html> <page.css> papers/<name>/index.html "<title>" <name>.js [more.js ...]
# Builds a paper page from a <main class="pp"> fragment, using papers/barista/index.html as the shell (head, navbar, footer).
import sys
main, css, out, title = sys.argv[1:5]
scripts = sys.argv[5:]
t = open('papers/barista/index.html').read()
i = t.index('<main class="pp"'); j = t.index('<div class="pp-tooltip"'); j = t.index('</div>', j) + len('</div>')
body = open(main).read().strip()
# relative paths inside the folder page
body = body.replace('src="assets/', 'src="../../assets/').replace('href="assets/', 'href="../../assets/').replace('href="papers/', 'href="../../papers/')
t = t[:i] + body + t[j:]
a = t.index('<title>'); b = t.index('</title>') + len('</title>')
t = t[:a] + '<title>' + title + '</title>' + t[b:]
k = t.index('<script src="../../assets/js/paper-dfa.js"></script>')
e = t.index('</body>')
tags = '<script src="../../assets/js/paper-dfa.js"></script>\n<script src="../../assets/js/paper-zoom.js"></script>\n' + ''.join('<script src="../../assets/js/%s"></script>\n' % s for s in scripts)
t = t[:k] + tags + t[e:]
style = '    <style>\n' + open(css).read().rstrip() + '\n    </style>\n'
t = t.replace('    <link rel="stylesheet" href="../../assets/css/paper-page.css">\n', '    <link rel="stylesheet" href="../../assets/css/paper-page.css">\n' + style)
open(out, 'w').write(t)
print(out, len(t))
