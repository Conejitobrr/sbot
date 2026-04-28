agregar al bot para que no se detenga

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
  sleep 5
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
