exports.handler = async (m, { conn, args, prefix, command }) => {
    if (!args[0]) return m.reply(`*භාවිතය:* ${prefix}${command} 9477XXXXXXX`)
    let number = args[0].replace(/[^0-9]/g, '')
    if(!number.startsWith('94')) number = '94' + number
    try {
        await m.reply('⏳ Code එක generate වෙනවා...')
        let code = await conn.requestPairingCode(number)
        await m.reply(`✅ *Code එක:* \`\`${code}\`\n\nSettings > Linked Devices > Link with phone number`)
    } catch (e) {
        m.reply(`❌ Error: ${e.message}`)
    }
}