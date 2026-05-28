'use strict';

const fs = require('fs');
const path = require('path');

const shop = require('../lib/shop');

const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');

const ITEMS = {
  ver: {
    key: 'verUses',
    name: '🎟️ Uso de .ver',
    price: 10000,
    desc: 'Permite usar .ver 1 vez'
  },

  spotify: {
    key: 'spotifyUses',
    name: '🎵 Uso de .spotify',
    price: 15000,
    desc: 'Permite usar .spotify 1 vez'
  },

  llave: {
    key: 'keys',
    name: '🔑 Llave de celda',
    price: 12000,
    desc: 'Permite salir de la cárcel 1 vez'
  }
};

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function cleanNumber(jid = '') {
  return cleanJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

function loadJail() {
  try {
    if (!fs.existsSync(JAIL_PATH)) {
      return { jailed: {}, fame: {} };
    }

    return JSON.parse(fs.readFileSync(JAIL_PATH, 'utf8') || '{}');
  } catch {
    return { jailed: {}, fame: {} };
  }
}

function saveJail(data) {
  try {
    const dir = path.dirname(JAIL_PATH);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(JAIL_PATH, JSON.stringify(data, null, 2));
  } catch {}
}

function msToTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;

  return `${m} min ${s} seg`;
}

function shopText() {
  return (
`🛒 *TIENDA SIRIUSBOT*

🎟️ *ver*
➤ Uso de *.ver*
➤ Precio: *${ITEMS.ver.price} XP*
➤ Compra: *.comprar ver*

🎵 *spotify*
➤ Uso de *.spotify*
➤ Precio: *${ITEMS.spotify.price} XP*
➤ Compra: *.comprar spotify*

🔑 *llave*
➤ Llave de celda
➤ Precio: *${ITEMS.llave.price} XP*
➤ Compra: *.comprar llave*

📦 También puedes comprar varios:
*.comprar ver 2*
*.comprar spotify 3*

🎒 Ver inventario:
*.inventario*

🔓 Usar llave:
*.usar llave*`
  );
}

module.exports = {
  commands: ['tienda', 'comprar', 'inventario', 'usar', 'llave'],

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      msg,
      sender,
      args,
      command,
      db
    } = ctx;

    try {
      const user = cleanJid(sender);

      if (command === 'tienda') {
        return sock.sendMessage(remoteJid, {
          text: shopText()
        }, { quoted: msg });
      }

      if (command === 'inventario') {
        const inv = await shop.getInventory(user);

        return sock.sendMessage(remoteJid, {
          text:
`🎒 *INVENTARIO*

👤 Usuario: @${cleanNumber(user)}

🎟️ Usos de .ver: *${inv.verUses || 0}*
🎵 Usos de .spotify: *${inv.spotifyUses || 0}*
🔑 Llaves de celda: *${inv.keys || 0}*`,
          mentions: [user]
        }, { quoted: msg });
      }

      if (command === 'llave') {
        args.unshift('llave');
      }

      if (command === 'usar') {
        const item = (args[0] || '').toLowerCase();

        if (item !== 'llave') {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Uso incorrecto.

Ejemplo:
*.usar llave*`
          }, { quoted: msg });
        }

        const inv = await shop.getInventory(user);

        if ((inv.keys || 0) <= 0) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ No tienes llaves de celda.

Compra una en la tienda:
*.comprar llave*

💰 Precio: *${ITEMS.llave.price} XP*`
          }, { quoted: msg });
        }

        const jailDB = loadJail();
        jailDB.jailed = jailDB.jailed || {};

        const jail = jailDB.jailed[user];

        if (!jail || Number(jail.until || 0) <= Date.now()) {
          if (jail) {
            delete jailDB.jailed[user];
            saveJail(jailDB);
          }

          return sock.sendMessage(remoteJid, {
            text: '✅ No estás arrestado. No se usó ninguna llave.'
          }, { quoted: msg });
        }

        const used = await shop.useItem(user, 'keys', 1);

        if (!used) {
          return sock.sendMessage(remoteJid, {
            text: '❌ No tienes llaves disponibles.'
          }, { quoted: msg });
        }

        delete jailDB.jailed[user];
        saveJail(jailDB);

        return sock.sendMessage(remoteJid, {
          text:
`🔑 *LLAVE USADA*

⛓️ Abriste la celda y escapaste de prisión.

✅ Ya puedes usar comandos nuevamente.`
        }, { quoted: msg });
      }

      if (command === 'comprar') {
        const itemName = (args[0] || '').toLowerCase();
        const amount = Math.max(1, Math.min(10, Number(args[1]) || 1));

        const item = ITEMS[itemName];

        if (!item) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ Producto no válido.

Productos disponibles:
➤ ver
➤ spotify
➤ llave

Ejemplo:
*.comprar ver*
*.comprar spotify*
*.comprar llave*`
          }, { quoted: msg });
        }

        const userData = await db.getUser(user);
        const xp = Number(userData.xp || 0);
        const total = item.price * amount;

        if (xp < total) {
          return sock.sendMessage(remoteJid, {
            text:
`❌ No tienes suficiente XP.

🛒 Producto: *${item.name}*
📦 Cantidad: *${amount}*
💰 Costo total: *${total} XP*
⭐ Tu XP actual: *${xp} XP*
📌 Te faltan: *${total - xp} XP*

Usa más el bot, reclama XP o participa en eventos para juntar más.`
          }, { quoted: msg });
        }

        await db.removeXP(user, total);
        await shop.addItem(user, item.key, amount);

        const inv = await shop.getInventory(user);

        return sock.sendMessage(remoteJid, {
          text:
`✅ *COMPRA REALIZADA*

🛒 Producto: *${item.name}*
📦 Cantidad: *${amount}*
💰 Pagaste: *${total} XP*

🎒 *Tu inventario ahora:*
🎟️ .ver: *${inv.verUses || 0}*
🎵 .spotify: *${inv.spotifyUses || 0}*
🔑 Llaves: *${inv.keys || 0}*`
        }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en tienda:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error usando la tienda.'
      }, { quoted: msg });
    }
  }
};
