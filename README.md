agregar al bot para que no se detenga

nano start.sh


#!/bin/bash

while true
do
  echo "🚀 Iniciando bot..."
  node index.js

  echo "❌ El bot se detuvo o se cayó"
  echo "🔄 Reiniciando en 5 segundos..."
  sleep 5
done

crl x + y luego enter

luego 

chmod +x start.sh

y siempre iniciar con


./start.sh


así el bot nunca se cerrará de termux
