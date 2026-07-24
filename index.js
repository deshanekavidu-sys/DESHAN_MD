const express = require('express');
const app = express();
const __path = process.cwd();
const PORT = process.env.PORT || 8000;

// Baileys + Bot Code
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

let sock;
let code = require('./pair');

require('events').EventEmitter.defaultMaxListeners = 500;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/code', code);
app.use('/pair', async (req, res) => res.sendFile(__path + '/pair.html'));
app.use('/settings', async (req, res) => res.sendFile(__path + '/settings.html'));
app.use('/', async (req, res) => res.sendFile(__path + '/main.html'));

app.listen(PORT, () => {
  console.log(`╔═══════════╗`);
  console.log(`║ DESHAN MD— ONLINE Port: ${PORT} ║`);
  console.log(`╚═══════════════════════════╝`);
});

// ============= BOT START =============
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ['DESHAN-MD', 'Chrome', '1.0.0']
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async (m) => {
        if(!m.messages[0].message) return;
        const msg = m.messages[0];
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const sender = msg.key.participant || from;
        const command = text.toLowerCase().trim();

        //.menu command
        if(command === '.menu'){
            let menuText = `
╭───「 *DESHAN-MD* 」───╮
👋 Hello @${sender.split("@")[0]}

*BOT MENU* ✅

*1* 🔥.ping - Bot speed
*2* 💻.pair - Pair code ගන්න
*3* 👑.owner - Owner info

*භාවිතය:* අංකෙ type කරලා එවන්න
උදා: *1*
╰────────────────╯`

            await sock.sendMessage(from, {
                text: menuText,
                mentions: [sender]
            })
        }

        // අංක click කරාම
        if(command === '1'){
            let start = new Date().getTime()
            await sock.sendMessage(from, {text: '🏓 Ponging...'})
            let end = new Date().getTime()
            await sock.sendMessage(from, {text: `🏓 Pong! Speed: ${end - start}ms`})
        }

        if(command === '2'){
            await sock.sendMessage(from, {text: `භාවිතය: /pair 9477XXXXXXX\nහෝ Website එකෙන් ගන්න: /pair`})
        }

        if(command === '3'){
            await sock.sendMessage(from, {text: `👑 Owner: Deshan\nWa.me/9477XXXXXXX`})
        }

    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            if(lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
                startBot();
            }
        }
    })
}

startBot();