// Copia los archivos de la app web a www/, la carpeta que Capacitor empaqueta en el APK.
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const destino = path.join(raiz, 'www');
const ARCHIVOS = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons'];

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(destino);
for (const nombre of ARCHIVOS) {
  fs.cpSync(path.join(raiz, nombre), path.join(destino, nombre), { recursive: true });
}
console.log(`App web copiada a ${path.relative(raiz, destino)}/`);
