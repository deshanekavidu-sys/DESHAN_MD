let handler = async (m, { conn, args, prefix, command }) => {
    // Number එක දීලා නැත්නම්
    if (!args[0]) {
        return m.reply(`╭━━━〔 *PAIRING CODE* 〕━━━⬣
┃
┃ *භාවිතය:* ${prefix}${command} 9477XXXXXXX
┃ *උදා:* ${prefix}${command} 94771234567
┃
┃ *සටහන:* +94 වෙනුවට 94 දාන්න
┃
╰━━━━━━━━━━━⬣`)
    }

    let number = args[0].replace(/[^0-9]/g, '')

    try {
        await m.reply('⏳ Code එක generate වෙනවා... තත්පර 5ක් ඉන්න')

        let code = await conn.requestPairingCode(number)

        await conn.sendMessage(m.chat, {
            text: `╭━━━〔 *✅ SUCCESS* 〕━━━⬣
┃
┃ *ඔයාගේ Pair Code එක:*
┃ *${code}*
┃
┃ *කොහොමද Link කරන්නේ?*
┃ 1. WhatsApp Open කරන්න
┃ 2. Settings > Linked Devices
┃ 3. "Link with Pairing Code" ඔබන්න
┃ 4. උඩ Code එක දාන්න
┃
┃ *⏰ Code එක විනාඩි 1න් Expire වෙනවා*
┃
╰━━━━━━━━━━━━━━━━━━━⬣`,
            mentions: [m.sender]
        })

    } catch (e) {
        m.reply(`❌ *Error:* \nBot එක login වෙලා නෑ හරි number එක