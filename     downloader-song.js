import axios from 'axios'

let handler = async (m, { conn, text }) => {
    if (!text) return m.reply(`*Usage:*.song song name`)
    const apiKey = 'zanta_DGLxmeRvwewS4gtVGbYsBaNV'

    await m.react('🔍')
    try {
        // 1. SEARCH
        let {data: s} = await axios.get(`https://api.zanta-mini.store/api/yts?apiKey=${apiKey}&query=${encodeURIComponent(text)}`)
        if(!s.status ||!s.data.length) return m.reply('Song not found')

        let video = s.data[0]
        await m.react('⏳')

        // 2. DOWNLOAD MP3
        let {data: d} = await axios.get(`https://api.zanta-mini.store/api/ytmp3?apiKey=${apiKey}&url=${encodeURIComponent(video.url)}`)
        if(!d.status) return m.reply('Download link not found')

        // 3. SEND
        let caption = `🎧 *ZANTA DOWNLOADER*\n📋 *Title:* ${video.title}\n🕖 *Duration:* ${video.duration}`
        await conn.sendMessage(m.chat, {image: {url: video.thumbnail}, caption}, {quoted: m})

        await conn.sendMessage(m.chat, {
            audio: { url: d.data.url },
            mimetype: 'audio/mpeg',
            fileName: video.title + '.mp3'
        }, {quoted: m})

        await m.react('✅')
    } catch(e) {
        await m.react('❌')
        m.reply('Error: ' + e.message)
    }
}

handler.command = ['song']
export default handler