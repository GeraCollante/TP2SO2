// Arma www/ (lo que va adentro del APK) a partir del juego: fuentes locales, sin internet,
// diagrama con mermaid local y salas por Bluetooth.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
const nm = (p) => new URL('../node_modules/' + p, import.meta.url);
const root = new URL('../', import.meta.url);
mkdirSync(new URL('www/fonts/', root), { recursive: true });
const fonts = {
  'gotisch.woff2': '@fontsource-variable/grenze-gotisch/files/grenze-gotisch-latin-wght-normal.woff2',
  'grenze-400.woff2': '@fontsource/grenze/files/grenze-latin-400-normal.woff2',
  'grenze-600.woff2': '@fontsource/grenze/files/grenze-latin-600-normal.woff2',
  'grenze-700.woff2': '@fontsource/grenze/files/grenze-latin-700-normal.woff2',
  'runic.woff2': '@fontsource/noto-sans-runic/files/noto-sans-runic-runic-400-normal.woff2',
};
for (const [dst, src] of Object.entries(fonts)) copyFileSync(nm(src), new URL('www/fonts/' + dst, root));
copyFileSync(nm('mermaid/dist/mermaid.min.js'), new URL('www/mermaid.min.js', root));
copyFileSync(new URL('game/nearby.js', root), new URL('www/nearby.js', root));

let game = readFileSync(new URL('game/odin.html', root), 'utf8');
const swap = (a, b) => { if (!game.includes(a)) throw new Error('No encontré: ' + a.slice(0, 60)); game = game.split(a).join(b); };
// fuera Google Fonts (en la cancha no hay internet)
game = game.replace(/<link rel="preconnect"[^>]*>\n?/g, '').replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/g, '');
// textos del modo cercano
swap('id="btnOnline" type="button">Online</button>', 'id="btnOnline" type="button">Bluetooth</button>');
swap('<h2 id="onTitle">Jugar online</h2>', '<h2 id="onTitle">Jugar cerca</h2>');
swap('Cada uno juega desde su celular. Todos tienen que abrir el juego con la sesión de Claude iniciada.',
     'Cada uno juega desde su celular, sin internet. Tienen que estar a pocos metros, con el Bluetooth activado (en Android viejos, también la ubicación).');
swap("'Online · sala '", "'Bluetooth · sala '");
swap("(NET.hostSeen ? 'Esperando que el anfitrión empiece la partida…' : 'Buscando la sala…')",
     "(NET.hostSeen ? 'Esperando que el anfitrión empiece la partida…' : 'Buscando la sala ' + NET.code + ' cerca… Acercá los celulares.')");

const faces = `<style>
@font-face{font-family:"Grenze Gotisch";font-weight:100 900;font-display:swap;src:url(fonts/gotisch.woff2) format("woff2")}
@font-face{font-family:"Grenze";font-weight:400;font-display:swap;src:url(fonts/grenze-400.woff2) format("woff2")}
@font-face{font-family:"Grenze";font-weight:600;font-display:swap;src:url(fonts/grenze-600.woff2) format("woff2")}
@font-face{font-family:"Grenze";font-weight:700;font-display:swap;src:url(fonts/grenze-700.woff2) format("woff2")}
@font-face{font-family:"Noto Sans Runic";font-display:swap;src:url(fonts/runic.woff2) format("woff2")}
</style>`;
const reset = ':root{color-scheme:dark;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;padding:0;background:#120d09}img{max-width:100%}[hidden]{display:none!important}';
const mermaidBoot = `<script src="mermaid.min.js"></script>
<script>
(function () {
  var done = false, b = document.getElementById('btnRules');
  if (!b || !window.mermaid) return;
  mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict', fontFamily: 'Grenze, Georgia, serif' });
  b.addEventListener('click', function () {
    if (done) return; done = true;
    setTimeout(function () { mermaid.run({ querySelector: '#ovRules pre.mermaid' }).catch(function () {}); }, 60);
  });
})();
</script>`;
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${reset}</style>${faces}</head><body>
<script src="nearby.js"></script>
${game}
${mermaidBoot}
</body></html>`;
writeFileSync(new URL('www/index.html', root), html);
console.log('www/index.html listo (' + Math.round(html.length / 1024) + ' KB)');
