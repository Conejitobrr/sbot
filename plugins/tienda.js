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
    price: 1500,
    desc: 'Permite usar .spotify 1 vez'
  },
  llave: {
    key: 'keys',
    name: '🔑 Llave de celda',
    price: 1000,
    desc: 'Permite salir de la cárcel 1 vez'
  },
  cana: {
    key: 'cana',
    name: '🎣 Caña de pescar',
    price: 2000,
    desc: 'Necesaria para poder pescar'
  },
  arma: {
    key: 'arma',
    name: '🏹 Arma de caza',
    price: 2000,
    desc: 'Necesaria para poder cazar'
  },
  pico: {
    key: 'pico',
    name: '⛏️ Pico de minería',
    price: 2000,
    desc: 'Necesario para poder minar'
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
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(JAIL_PATH, JSON.stringify(data, null, 2));
  } catch {}
}

function shopText() {
  return (
`🛒 *TIENDA SIRIUSBOT*

🎟️ *ver*
➤ Precio: *${ITEMS.ver.price} XP*
➤ Desc: *${ITEMS.ver.desc}*

🎵 *spotify*
➤ Precio: *${ITEMS.spotify.price} XP*
➤ Desc: *${ITEMS.spotify.desc}*

🔑 *llave*
➤ Precio: *${ITEMS.llave.price} XP*
➤ Desc: *${ITEMS.llave.desc}*

🎣 *cana*
➤ Precio: *${ITEMS.cana.price} XP*
➤ Desc: *${ITEMS.cana.desc}*

🏹 *arma*
➤ Precio: *${ITEMS.arma.price} XP*
➤ Desc: *${ITEMS.arma.desc}*

⛏️ *pico*
➤ Precio: *${ITEMS.pico.price} XP*
➤ Desc: *${ITEMS.pico.desc}*

📦 Compra así:
*.comprar [nombre] [cantidad]*
Ejemplo: *.comprar cana 1*

🎒 Ver inventario:
*.inventario*

🔓 Usar llave:
*.usar llave*`
  );
}

module.exports = {
  commands: ['tienda', 'comprar', 'inventario', 'usar', 'llave'],

  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args, command, db } = ctx;

    try {
      const user = cleanJid(sender);

      if (command === 'tienda') {
        return sock.sendMessage(remoteJid, { text: shopText() }, { quoted: msg });
      }

      if (command === 'inventario') {
        const inv = await shop.getInventory(user);
        return sock.sendMessage(remoteJid, {
          text:
`🎒 *INVENTARIO*

👤 Usuario: @${cleanNumber(user)}

🎟️ Usos de .ver: *${inv.verUses || 0}*
🎵 Usos de .spotify: *${inv.spotifyUses || 0}*
🔑 Llaves de celda: *${inv.keys || 0}*
🎣 Cañas: *${inv.cana || 0}*
🏹 Armas: *${inv.arma || 0}*
⛏️ Picos: *${inv.pico || 0}*`,
          mentions: [user]
        }, { quoted: msg });
      }

      if (command === 'llave') {
        args.unshift('llave');
      }

      if (command === 'usar') {
        const item = (args[0] || '').toLowerCase();

        if (item !== 'llave') {
          return sock.sendMessage(remoteJid, { text: '❌ Solo puedes usar la *llave* actualmente.' }, { quoted: msg });
        }

        const inv = await shop.getInventory(user);
        if ((inv.keys || 0) <= 0) {
          return sock.sendMessage(remoteJid, { text: '❌ No tienes llaves de celda.' }, { quoted: msg });
        }

        const jailDB = loadJail();
        jailDB.jailed = jailDB.jailed || {};
        const jail = jailDB.jailed[user];

        if (!jail || Number(jail.until || 0) <= Date.now()) {
          if (jail) {
            delete jailDB.jailed[user];
            saveJail(jailDB);
          }
          return sock.sendMessage(remoteJid, { text: '✅ No estás arrestado.' }, { quoted: msg });
        }

        const used = await shop.useItem(user, 'keys', 1);
        if (!used) return sock.sendMessage(remoteJid, { text: '❌ Error al usar llave.' }, { quoted: msg });

        delete jailDB.jailed[user];
        saveJail(jailDB);

        return sock.sendMessage(remoteJid, { text: '🔑 *LLAVE USADA*\n\nEscapaste de prisión.' }, { quoted: msg });
      }

      if (command === 'comprar') {
        const itemName = (args[0] || '').toLowerCase();
        const amount = Math.max(1, Math.min(10, Number(args[1]) || 1));
        const item = ITEMS[itemName];

        if (!item) {
          return sock.sendMessage(remoteJid, { text: '❌ Producto no válido. Revisa *.tienda*' }, { quoted: msg });
        }

        const userData = await db.getUser(user);
        const xp = Number(userData.xp || 0);
        const total = item.price * amount;

        if (xp < total) {
          return sock.sendMessage(remoteJid, {
            text: `❌ No tienes suficiente XP.\nNecesitas: *${total} XP*\nTu XP: *${xp} XP*`
          }, { quoted: msg });
        }

        await db.removeXP(user, total);
        await shop.addItem(user, item.key, amount);
        const inv = await shop.getInventory(user);

        return sock.sendMessage(remoteJid, {
          text: `✅ *COMPRA REALIZADA*\n\n🛒 Producto: *${item.name}*\n📦 Cantidad: *${amount}*\n💰 Pagaste: *${total} XP*`
        }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en tienda:', err?.message || err);
    }
  }
};
