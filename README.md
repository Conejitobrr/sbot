🚀 1. ACTUALIZAR TERMUX
```bash
pkg update -y
pkg upgrade -y
```
🧰 2. INSTALAR HERRAMIENTAS CLAVE
🔥 FFmpeg (STICKERS + AUDIO + VIDEO)
```bash
pkg install ffmpeg -y
```
🔧 ARREGLAR FFmpeg (LO QUE TE FUNCIONÓ)
Bash
```bash
pkg reinstall ffmpeg x265 -y
```
👉 Esto soluciona:

CANNOT LINK EXECUTABLE ffmpeg
🐍 Python (para descargas)
```bash
pkg install python -y
```
🎬 yt-dlp (YouTube, TikTok, etc)
```bash
pip install -U yt-dlp
```
🖼️ ImageMagick (para tovideo)
```bash
pkg install imagemagick -y
```
📦 3. DEPENDENCIAS DEL BOT (NPM)
Dentro de tu carpeta del bot:
```bash
npm install
```
⚠️ EXTRA (IMPORTANTE)
Para TTS (porque te falló):
```bash
npm install gtts
```


🧪 VERIFICAR TODOS LOS PLUGINS (COMPLETO)
📌 1. Crear archivo
```bash
nano test_plugins.js
```
📌 2. Pegar esto (IMPORTANTE)
```bash
const fs = require('fs');
const path = require('path');

const dirs = ['plugins', 'plugin'];
const pluginsDir = dirs.find(d => fs.existsSync(d));

if (!pluginsDir) {
  console.log('❌ No existe carpeta plugins ni plugin');
  process.exit(1);
}

const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));

let ok = 0;
let fail = 0;

for (const file of files) {
  try {
    const plugin = require(path.join(process.cwd(), pluginsDir, file));

    // 🔍 detectar tipo
    const hasCommands = Array.isArray(plugin.commands);
    const hasExecute = typeof plugin.execute === 'function';
    const hasOnMessage = typeof plugin.onMessage === 'function';

    // 🔥 VALIDACIONES
    if (!hasExecute && !hasOnMessage) {
      console.log(`❌ ${file} → NO tiene execute ni onMessage`);
      fail++;
      continue;
    }

    if (hasExecute && (!hasCommands || !plugin.commands.length)) {
      console.log(`❌ ${file} → commands inválido`);
      fail++;
      continue;
    }

    // 🧠 MOSTRAR TIPO
    if (hasExecute && hasOnMessage) {
      console.log(`🔥 ${file} → comando + evento (${plugin.commands.join(', ')})`);
    } else if (hasExecute) {
      console.log(`✅ ${file} → comando (${plugin.commands.join(', ')})`);
    } else if (hasOnMessage) {
      console.log(`🎧 ${file} → evento automático`);
    }

    ok++;

  } catch (e) {
    console.log(`❌ ${file} → ERROR: ${e.message}`);
    fail++;
  }
}

console.log('\n📊 RESULTADO FINAL');
console.log('✅ OK:', ok);
console.log('❌ FALLAS:', fail);
```
📌 3. Ejecutar
```bash
node test_plugins.js
```












Agregar al repositorio clonado del bot en termux para que no se detenga

```bash
nano start.sh
```

```bash
#!/bin/bash

while true
do
  echo "🚀 Iniciando bot..."
  node index.js

  echo "❌ El bot se detuvo o se cayó"
  echo "🔄 Reiniciando en 5 segundos..."
  sleep 2
done
```

Presiomar CTRL + X + Y, luego ENTER

luego 

```bash
chmod +x start.sh
```
y siempre iniciar con

```bash
./start.sh
```

así el bot nunca se cerrará de termux
