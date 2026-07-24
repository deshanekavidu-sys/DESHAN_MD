import { default as makeWASocket, useMultiFileAuthState, DisconnectReason, delay } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'
import pino from 'pino'

const prefix = '.'

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRCode: true // පලවෙනි පාරට QR scan කරන්න
    })

    conn.ev.on('creds.update', saveCreds)

    // reconnect logic
    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut
            console.log('Reconnecting...', shouldReconnect)
            if(shouldReconnect) startBot()
        } else if(connection === 'open') {
            console.log('Bot Connected ✅')
        }
    })

    // plugins load කරනවා
    const plugins = {}
    const pluginFiles = fs.readdirSync('./plugins').filter(file => file.endsWith('.js'))
    for (let file of pluginFiles) {
        plugins[file] = await import(`./plugins/${file}`)
        console.log(`Loaded: ${file}`)
    }

    // message handler
    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0]
            if (!m.message || m.key.fromMe) return

            const msg = m.message.conversation || m.message.extendedTextMessage?.text || ''
            if (!msg.startsWith(prefix)) return

            const args = msg.slice(prefix.length).trim().split(/ +/)
            const command = args.shift().toLowerCase()

            for (let name in plugins) {
                let plugin = plugins[name].default
                if (plugin.command && plugin.command.includes(command)) {
                    await plugin.handler(m, { conn, args, prefix, command })
                }
            }

        } catch (e) {
            console.log(e)
        }
    })
}

startBot()