import base64, json, os, re, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=ROOT+'/app/src'
def b64(p): return base64.b64encode(open(p,'rb').read()).decode()
imgmap=json.load(open(SRC+'/img/map.json'))
imgs={n:'data:image/webp;base64,'+b64(f'{SRC}/img/{s}.webp') for n,s in imgmap.items()}
fonts=''.join(f"@font-face{{font-family:'{f}';src:url(data:font/woff;base64,{b64(f'{SRC}/fonts/{f}.woff')}) format('woff');font-weight:300 900;font-style:normal;font-display:swap}}" for f in ['Rubik','Nunito'])
css=open(SRC+'/styles.css').read()
js_data=open(SRC+'/data.js').read()+'\n'+open(SRC+'/journey.js').read(); js_art=open(SRC+'/art.js').read()+'\n'+open(SRC+'/mascot.js').read(); js_app=open(SRC+'/app.js').read()
amap=json.load(open(SRC+'/audio/manifest.json')) if os.path.exists(SRC+'/audio/manifest.json') else {}
audio={k:'data:audio/mpeg;base64,'+b64(f'{SRC}/audio/{v}.mp3') for k,v in amap.items() if os.path.exists(f'{SRC}/audio/{v}.mp3')}
orn = r"""
(function(){var o=UDM_ART.ornamentStrip,r=document.documentElement.style;
function svgUrl(s){return 'url("data:image/svg+xml,'+encodeURIComponent(s)+'")';}
r.setProperty('--orn-top',o('#FFFFFF','#1E1A1D','#D7262E'));
r.setProperty('--orn-top-red',o('#D7262E','#1E1A1D',null));
r.setProperty('--orn-light',o('#FFFFFF','#1E1A1D',null));
r.setProperty('--orn-wod',o('#D7262E','#FFC23D',null));
r.setProperty('--orn-bg',o('#E6D8C5','#D9C9B3','#F3EADD'));
r.setProperty('--orn-v',svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="16"><path d="M4 1l3 7-3 7-3-7z" fill="#fff"/></svg>'));
r.setProperty('--orn-card',svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><path d="M14 3l11 11-11 11L3 14z" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><path d="M14 10l4 4-4 4-4-4z" fill="#1E1A1D" fill-opacity=".35"/><path d="M0 0l3 3M28 0l-3 3M0 28l3-3M28 28l-3-3" stroke="#fff" stroke-opacity=".35" stroke-width="2"/></svg>'));
})();"""
body = f"""<div id="app"></div>
<script>window.UDM_IMG={json.dumps(imgs)};window.UDM_AUDIO={json.dumps(audio,ensure_ascii=False)};</script>
<script>{js_data}</script>
<script>{js_art}</script>
<script>{orn}</script>
<script>{js_app}</script>"""
title='<title>Ӟеч-а бур-а удмурт кыл?</title>'
style=f'<style>{fonts}\n{css}</style>'
os.makedirs(ROOT+'/dist',exist_ok=True)
art=f"""{title}
<meta name="description" content="Мобильное приложение для изучения удмуртского языка детьми 5–10 лет">
{style}
{body}
"""
open(ROOT+'/dist/artifact.html','w').write(art)
full=f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#D7262E">
{title}
{style}
</head><body>
{body}
</body></html>"""
open(ROOT+'/dist/index.html','w').write(full)
for base in (ROOT, os.path.dirname(ROOT)):
    and_dir=os.path.join(base,'android','UdmurtKyl','app','src','main','assets','www')
    if os.path.isdir(os.path.dirname(and_dir)): break
if os.path.isdir(os.path.dirname(and_dir)):
    os.makedirs(and_dir,exist_ok=True); open(os.path.join(and_dir,'index.html'),'w').write(full)
print('artifact', os.path.getsize(ROOT+'/dist/artifact.html')//1024,'KB; images',len(imgs))
