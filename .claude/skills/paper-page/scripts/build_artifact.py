# Usage (from repo root): python3 -I .claude/skills/paper-page/scripts/build_artifact.py <name> <out.html> "<artifact title>"
# Bundles papers/<name>/index.html into one self-contained HTML file (inlined CSS, JS, images, font) for an Artifact preview.
import sys, re, base64, os
page, out, title = sys.argv[1], sys.argv[2], sys.argv[3]
MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml'}
def b64(path, mime): return 'data:%s;base64,%s' % (mime, base64.b64encode(open(path, 'rb').read()).decode())
site = 'https://catarinagamboa.github.io/'
s = open('papers/%s/index.html' % page).read().replace('"../../', '"')
css = open('assets/css/style-starter.css').read()
i = css.index('@font-face'); j = css.index('}', i) + 1
css = css[:i] + '@font-face { font-family: "FontAwesome"; src: url("%s") format("woff2"); font-weight: normal; font-style: normal; }' % b64('assets/fonts/fontawesome-webfont.woff2', 'font/woff2') + css[j:]
css = css.replace('rgba(38, 40, 40, 0.78)), url(../images/cp2.jpg)', 'rgba(38, 40, 40, 0.78)), url("%s")' % b64('assets/images/cp2.jpg', 'image/jpeg'))
css = css.replace('url(../images/cp2.jpg)', 'none')
pp = open('assets/css/paper-page.css').read()
head = s[s.index('<head>') + 6:s.index('</head>')]
body = s[s.index('<body>') + 6:s.index('</body>')]
head = re.sub(r'<title>.*?</title>', '<title>%s</title>' % title, head)
head = re.sub(r'\s*<link rel="icon"[^>]*>', '', head)
head = re.sub(r'\s*<meta [^>]*>', '', head)
head = head.replace('<link rel="stylesheet" href="assets/css/style-starter.css">', '<style>\n' + css + '\n</style>')
head = head.replace('<link rel="stylesheet" href="assets/css/paper-page.css">', '<style>\n' + pp + '\n</style>')
body = re.sub(r'<script src="(assets/js/(?!jquery|bootstrap)[^"]*\.js)"></script>', lambda m: '<script>\n' + open(m.group(1)).read() + '\n</script>', body)
body = body.replace('<script src="assets/js/jquery-3.3.1.min.js"></script>', '<script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>')
body = re.sub(r'<script src="https://stackpath\.bootstrapcdn\.com/bootstrap/4\.4\.1/js/bootstrap\.min\.js"[^>]*>\s*</script>',
              '<script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.4.1/js/bootstrap.min.js"></script>', body)
body = re.sub(r'src="(assets/images/[^"]+)"', lambda m: 'src="%s"' % b64(m.group(1), MIME[os.path.splitext(m.group(1))[1].lower()]), body)
def absl(m):
    url = m.group(2)
    if re.match(r'(https?:|#|data:|mailto:)', url): return m.group(0)
    return '%s="%s%s"' % (m.group(1), site, url)
body = re.sub(r'(href|data-pdf)="([^"]*)"', absl, body)
assert 'src="assets' not in body and 'stackpath' not in body and 'src="../' not in body
out_s = head.strip() + '\n' + body
open(out, 'w').write(out_s)
print(out, len(out_s) // 1024, 'KB')
