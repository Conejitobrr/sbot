'use strict';

const db = require('../lib/database');

const groupSessions = new Map();
const botBetCooldowns = new Map(); 

const MAX_GAMES_PER_GROUP = 3;
const MAX_BET = 2000; 
const BOT_COOLDOWN_MINS = 10; 

// ==========================================
// FUNCIONES DE UTILIDAD Y MENCIONES
// ==========================================
function cleanJid(jid = '') {
    if (!jid) return '';
    const str = String(jid);
    const user = str.split(':')[0].split('@')[0];
    const domain = str.includes('@') ? str.split('@')[1] : 's.whatsapp.net';
    return `${user}@${domain}`;
}

function number(jid = '') {
    return String(jid).split(':')[0].split('@')[0].replace(/\D/g, '');
}

function getTarget(msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted) return cleanJid(quoted);
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (mentioned) return cleanJid(mentioned);
    return null;
}

// ==========================================
// MECÁNICAS DEL TRES EN RAYA
// ==========================================
const WIN_COMBOS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

function checkWin(board, mark) {
  return WIN_COMBOS.some(combo => combo.every(idx => board[idx] === mark));
}

function renderBoard(board) {
  const numEmojis = {
    1: '1️⃣', 2: '2️⃣', 3: '3️⃣',
    4: '4️⃣', 5: '5️⃣', 6: '6️⃣',
    7: '7️⃣', 8: '8️⃣', 9: '9️⃣'
  };
  const b = board.map(val => {
    if (val === 'X') return '✖️'; // X Negra
    if (val === 'O') return '⭕'; // O Roja
    return numEmojis[val];
  });
  return `\n  ${b[0]} │ ${b[1]} │ ${b[2]} \n ───┼───┼─── \n  ${b[3]} │ ${b[4]} │ ${b[5]} \n ───┼───┼─── \n  ${b[6]} │ ${b[7]} │ ${b[8]} \n`;
}

function getBotMove(board) {
  for (let i = 0; i < 9; i++) {
    if (typeof board[i] === 'number') {
      const backup = board[i]; board[i] = 'O';
      if (checkWin(board, 'O')) { board[i] = backup; return i; }
      board[i] = backup;
    }
  }
  for (let i = 0; i < 9; i++) {
    if (typeof board[i] === 'number') {
      const backup = board[i]; board[i] = 'X';
      if (checkWin(board, 'X')) { board[i] = backup; return i; }
      board[i] = backup;
    }
  }
  if (typeof board[4] === 'number') return 4;
  const corners = [0, 2, 6, 8].filter(i => typeof board[i] === 'number');
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  const available = board.filter(i => typeof i === 'number');
  if (available.length > 0) return board.indexOf(available[Math.floor(Math.random() * available.length)]);
  return -1;
}

// ==========================================
// GESTIÓN DE SESIONES Y TIEMPO
// ==========================================
function getUserGame(remoteJid, userJid) {
    const games = groupSessions.get(remoteJid) || [];
    return games.find(g => g.player1 === userJid || g.player2 === userJid);
}

function removeGame(remoteJid, session) {
    if (session.timeoutId) clearTimeout(session.timeoutId);
    let games = groupSessions.get(remoteJid) || [];
    games = games.filter(g => g !== session);
    if (games.length === 0) groupSessions.delete(remoteJid);
    else groupSessions.set(remoteJid, games);
}

function startTimeout(sock, remoteJid, session) {
  if (session.timeoutId) clearTimeout(session.timeoutId);
  
  session.timeoutId = setTimeout(async () => {
    const currentTurn = session.turn;

    // 🔥 SISTEMA ANTI-ROBOS: Si P2 nunca jugó, la partida no fue aceptada.
    if (!session.accepted) {
        let txt = `⏱️ *¡EL DESAFÍO HA EXPIRADO!*\n\n@${number(session.player2)} no estaba activo o no aceptó el duelo a tiempo.`;
        if (session.bet > 0) {
            try { await db.addXP(session.player1, session.bet); } catch(e){} // Se le devuelve a P1
            txt += `\n♻️ La partida se cancela y se le devuelven los *${session.bet} XP* apostados a @${number(session.player1)}.`;
        } else {
            txt += `\n♻️ La partida ha sido cancelada sin penalizaciones.`;
        }
        removeGame(remoteJid, session);
        return sock.sendMessage(remoteJid, { text: txt, mentions: [session.player2, session.player1] });
    }

    // 🏆 CASTIGO POR ABANDONO EN PARTIDA OFICIAL (Ya aceptada)
    const winner = currentTurn === session.player1 ? session.player2 : session.player1;
    let txt = `⏱️ *¡TIEMPO AGOTADO!*\n\n@${number(currentTurn)} tardó más de 1 minuto en mover.`;
    const mentions = [currentTurn];

    if (session.bet > 0) {
        txt += `\n\n🏆 ¡@${number(winner)} gana por rendición automática!\n💰 Se lleva el pozo de *${session.bet * 2} XP*.`;
        mentions.push(winner);
        try { await db.addXP(winner, session.bet * 2); } catch(e){}
    } else {
        txt += `\n\n🏳️ Partida cancelada por abandono.`;
    }

    removeGame(remoteJid, session);
    sock.sendMessage(remoteJid, { text: txt, mentions });
  }, 60 * 1000); 
}

async function endGame(sock, remoteJid, session, result, winner = null, loser = null, msg) {
  removeGame(remoteJid, session);
  
  let txt = '';
  const mentions = [];
  
  if (result === 'win') {
     txt = `🏆 *¡HAY UN GANADOR!* 🏆\n\n🥇 Ganador: @${number(winner)}\n`;
     if (loser !== 'bot') mentions.push(winner, loser); else mentions.push(winner);
     txt += renderBoard(session.board);
     
     if (session.bet > 0) {
       try { await db.addXP(winner, session.bet * 2); } catch(e){} 
       txt += `\n💰 @${number(winner)} se lleva el pozo de *${session.bet * 2} XP*.`;
     } else {
       if (winner !== 'bot') { try { await db.addXP(winner, 50); } catch(e){} txt += `\n🎁 Te llevas *+50 XP* por la victoria.`; }
     }
  } else {
     txt = `🤝 *¡EMPATE!* 🤝\n` + renderBoard(session.board);
     if (session.player2 !== 'bot') mentions.push(session.player1, session.player2); else mentions.push(session.player1);
     
     if (session.bet > 0) {
        try { await db.addXP(session.player1, session.bet); await db.addXP(session.player2, session.bet); } catch(e){}
        txt += `\n♻️ El pozo ha sido devuelto a los jugadores.`;
     } else {
        try { await db.addXP(session.player1, 10); if(session.player2 !== 'bot') await db.addXP(session.player2, 10); } catch(e){}
        txt += `\n🎁 Recompensa: *+10 XP* para cada uno.`;
     }
  }
  sock.sendMessage(remoteJid, { text: txt, mentions }, { quoted: msg });
}

module.exports = {
  commands: ['michi', 'tictactoe', 'tresenraya'],
  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args, fromGroup } = ctx;
    if (!fromGroup) return sock.sendMessage(remoteJid, { text: '❌ Solo en grupos.' }, { quoted: msg });

    const p1 = cleanJid(sender);
    const session = getUserGame(remoteJid, p1);
    const action = args[0] ? args[0].toLowerCase().trim() : '';

    // ⛔ LÓGICA DE RENDICIÓN
    if (['salir', 'cancelar', 'abandonar'].includes(action)) {
      if (!session) return sock.sendMessage(remoteJid, { text: '❌ No estás jugando.', mentions: [p1] }, { quoted: msg });
      
      // Si el P2 aún no aceptaba y alguien cancela, devolvemos dinero a P1
      if (!session.accepted) {
          if (session.bet > 0) {
              try { await db.addXP(session.player1, session.bet); } catch(e){}
              removeGame(remoteJid, session);
              return sock.sendMessage(remoteJid, { text: `🏳️ @${number(p1)} canceló el duelo antes de empezar. Se devolvieron los *${session.bet} XP* a @${number(session.player1)}.`, mentions: [p1, session.player1] }, { quoted: msg });
          }
          removeGame(remoteJid, session);
          return sock.sendMessage(remoteJid, { text: `🏳️ Partida cancelada.`, mentions: [p1] }, { quoted: msg });
      }

      const winner = session.player1 === p1 ? session.player2 : session.player1;
      if (session.bet > 0) {
        try { await db.addXP(winner, session.bet * 2); } catch(e){}
        sock.sendMessage(remoteJid, { text: `🏳️ @${number(p1)} se rindió. ¡Gana @${number(winner)}!`, mentions: [p1, winner] }, { quoted: msg });
      } else {
        sock.sendMessage(remoteJid, { text: `🏳️ @${number(p1)} se rindió.`, mentions: [p1] }, { quoted: msg });
      }
      removeGame(remoteJid, session);
      return;
    }

    // 🟢 CREAR NUEVA PARTIDA
    if (!session) {
      if (getUserGame(remoteJid, p1)) return sock.sendMessage(remoteJid, { text: '❌ Ya estás en otra partida.' }, { quoted: msg });

      let target = getTarget(msg) || 'bot';
      let bet = parseInt(args.find(a => !isNaN(a) && !a.includes('@'))) || 0;

      if (bet > MAX_BET) return sock.sendMessage(remoteJid, { text: `❌ Límite: *${MAX_BET} XP*.` }, { quoted: msg });
      if (target === p1) return sock.sendMessage(remoteJid, { text: '❌ No puedes jugar contigo mismo.' }, { quoted: msg });
      
      // Cooldown vs Bot con apuesta
      if (target === 'bot' && bet > 0) {
          const last = botBetCooldowns.get(p1) || 0;
          if (Date.now() - last < BOT_COOLDOWN_MINS * 60000) {
              const timeLeft = Math.ceil((BOT_COOLDOWN_MINS * 60000 - (Date.now() - last)) / 60000);
              return sock.sendMessage(remoteJid, { text: `⏳ *¡CÁLMATE LUDÓPATA!*\n\nEspera *${timeLeft} min* para volver a apostar vs SiriusBot.` }, { quoted: msg });
          }
      }

      // Descuento SOLO a P1 al iniciar
      if (bet > 0) {
         const p1Data = await db.getUser(p1);
         if ((p1Data.xp || 0) < bet) return sock.sendMessage(remoteJid, { text: '❌ XP insuficiente.' }, { quoted: msg });
         if (target !== 'bot') {
             const p2Data = await db.getUser(target);
             if ((p2Data.xp || 0) < bet) { return sock.sendMessage(remoteJid, { text: `❌ @${number(target)} no tiene XP suficiente para apostar.`, mentions: [target] }, { quoted: msg }); }
         }
         await db.removeXP(p1, bet); 
      }

      const startingPlayer = Math.random() < 0.5 ? p1 : target;

      const newSession = {
        player1: p1, player2: target, board: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        turn: startingPlayer, bet, accepted: target === 'bot', timeoutId: null
      };

      if (newSession.turn === 'bot') {
          newSession.board[getBotMove(newSession.board)] = 'O';
          newSession.turn = p1;
      }
      
      groupSessions.set(remoteJid, [...(groupSessions.get(remoteJid) || []), newSession]);
      startTimeout(sock, remoteJid, newSession);
      if (target === 'bot' && bet > 0) botBetCooldowns.set(p1, Date.now());

      const txt = `⚔️ *PARTIDA DE MICHI* ⚔️\n` + 
                  (bet > 0 ? `💰 Pozo: ${bet * 2} XP\n` : '') +
                  `✖️ P1: @${number(p1)}\n⭕ P2: @${number(target)}\n` +
                  renderBoard(newSession.board) +
                  `\n🎲 Empieza: @${number(startingPlayer)}\n⏳ Tienes 1 minuto.` + 
                  (target !== 'bot' ? `\n_Para aceptar el reto, haz tu primera jugada._` : '');
      
      return sock.sendMessage(remoteJid, { text: txt, mentions: [p1, target] }, { quoted: msg });
    }

    // 🎮 PROCESAMIENTO DE TURNOS
    if (session.turn !== p1) return sock.sendMessage(remoteJid, { text: `⏳ Es el turno de @${number(session.turn)}`, mentions: [session.turn] }, { quoted: msg });
    const idx = parseInt(action) - 1;
    if (idx < 0 || idx > 8 || typeof session.board[idx] !== 'number') return sock.sendMessage(remoteJid, { text: '❌ Casilla inválida.' }, { quoted: msg });

    // 🔥 ACEPTACIÓN OFICIAL: Si P2 mueve por primera vez, se le cobra y se sella la partida.
    if (p1 === session.player2 && !session.accepted) {
        if (session.bet > 0) {
            const p2Data = await db.getUser(p1);
            if ((p2Data.xp || 0) < session.bet) {
                removeGame(remoteJid, session);
                try { await db.addXP(session.player1, session.bet); } catch(e){}
                return sock.sendMessage(remoteJid, { text: `❌ @${number(session.player2)} ya no tiene la XP. Duelo cancelado y dinero devuelto a P1.`, mentions: [session.player2, session.player1] }, { quoted: msg });
            }
            await db.removeXP(session.player2, session.bet);
        }
        session.accepted = true; 
    }

    session.board[idx] = (session.turn === session.player1) ? 'X' : 'O';
    
    if (checkWin(session.board, session.board[idx])) return endGame(sock, remoteJid, session, 'win', p1, p1 === session.player1 ? session.player2 : session.player1, msg);
    if (session.board.every(val => typeof val === 'string')) return endGame(sock, remoteJid, session, 'tie', null, null, msg);

    session.turn = (session.turn === session.player1) ? session.player2 : session.player1;
    if (session.turn === 'bot') {
        session.board[getBotMove(session.board)] = 'O';
        if (checkWin(session.board, 'O')) return endGame(sock, remoteJid, session, 'win', 'bot', p1, msg);
        if (session.board.every(val => typeof val === 'string')) return endGame(sock, remoteJid, session, 'tie', null, null, msg);
        session.turn = p1;
    }
    startTimeout(sock, remoteJid, session);
    sock.sendMessage(remoteJid, { text: `👉 Turno: @${number(session.turn)}` + renderBoard(session.board), mentions: [session.turn] }, { quoted: msg });
  }
};
