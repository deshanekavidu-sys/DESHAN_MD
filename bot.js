const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const fs = require('fs')
const pino = require('pino')

const prefix = '.'

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true
    })

    conn.ev.on('creds.update', saveCreds)

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            if(lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
                startBot()
            }
        } else if(connection === 'open') {
            console.log('BOT ONLINE ✅')
        }
    })

    // plugins load
    const plugins = fs.readdirSync('./plugins').filter(file => file.endsWith('.js'))
    for (let file of plugins) {
        require(`./plugins/${file}`)
        console.log(`Loaded: ${file}`)
    }

    // messages
    conn.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0]
        if (!m.message || m.key.fromMe) return

        const msg = m.message.conversation || m.message.extendedTextMessage?.text || ''
        if (!msg.startsWith(prefix)) return

        const args = msg.slice(prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()

        if(command === 'pair'){
            require('./plugins/pair.js').handler(m, { conn, args, prefix, command })
        }
    })
}

startBot()