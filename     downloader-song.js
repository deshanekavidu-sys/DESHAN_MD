import fetch from 'node-fetch'

const METADATA_DECRYPTION_KEY_HEX = 'C5D58EF67A7584E4A29F6C35BBC4EB12';

const SAVETUBE_USER_AGENTS = [
  'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile Safari/604.1'
];

function savetubeHeaders() {
  return {
    'Content-Type': 'application/json',
    'Origin': 'https://yt.savetube.me',
    'User-Agent': SAVETUBE_USER_AGENTS[Math.floor(Math.random() * SAVETUBE_USER_AGENTS.length)]
  };
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

function base64ToBytes(base64) {
  const binary = Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function aesDecrypt(data, keyHex) {
  const key = await crypto.subtle.importKey('raw', hexToBytes(keyHex), {name: 'AES-CBC'}, false, ['decrypt']);
  const iv = data.slice(0, 16);
  const encrypted = data.slice(16);
  const decrypted = await crypto.subtle.decrypt({name: 'AES-CBC', iv}, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

async function savetube(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
  if (!match) throw new Error('Invalid YouTube URL');
  const videoId = match[1];

  const cdnResponse = await fetch('https://media.savetube.vip/api/random-cdn', {headers: savetubeHeaders()});
  const cdnData = await cdnResponse.json();
  if (!cdnData.cdn) throw new Error('CDN unavailable');

  const infoResponse = await fetch(`https://${cdnData.cdn}/v2/info`, {
    method: 'POST', headers: savetubeHeaders(),
    body: JSON.stringify({url: `https://www.youtube.com/watch?v=${videoId}`})
  });
  const info = await infoResponse.json();
  const decrypted = await aesDecrypt(base64ToBytes(info.data), METADATA_DECRYPTION_KEY_HEX);
  const metadata = JSON.parse(decrypted);

  const downloadResponse = await fetch(`https://${cdnData.cdn}/download`, {
    method: 'POST', headers: savetubeHeaders(),
    body: JSON.stringify({id: videoId, downloadType: 'audio', quality: '320kbps', key: metadata.key})
  });
  const download = await downloadResponse.json();
  if (!download?.data?.downloadUrl) throw new Error('Download failed');

  return {title: metadata.title, duration: metadata.durationLabel, thumbnail: metadata.thumbnail, url: download.data.downloadUrl};
}

async function youtubeSearch(query) {
  const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
    headers: {'User-Agent': 'Mozilla/5.0 Chrome/124', 'Accept-Language': 'en-US,en;q=0.9'}
  });
  const html = await response.text();
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!match) throw new Error('Search failed');
  const data = JSON.parse(match[1]);
  const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.flatMap(x => x.itemSectionRenderer?.contents || []);
  const video = contents?.find(x => x.videoRenderer)?.videoRenderer;
  if (!video) throw new Error('Song not found');
  return {title: video.title?.runs?.[0]?.text || 'Unknown', url: `https://www.youtube.com/watch?v=${video.videoId}`, thumbnail: video.thumbnail?.thumbnails?.at(-1)?.url};
}

let handler = async (m, { conn, text }) => {
    if (!text) return m.reply(`*Usage:*.song song name or youtube link`)
    await m.react('🔍')

    let youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/
    let videoUrl = youtubeRegex.test(text)? text : (await youtubeSearch(text)).url

    await m.react('⏳')
    let result = await savetube(videoUrl)

    let caption = `「 ✦ DESHAN-MD SONG ✦ 」\n\n📋 *Title:* ${result.title}\n🕖 *Duration:* ${result.duration}\n🎫 *Quality:* 320kbps`

    await conn.sendMessage(m.chat, {image: {url: result.thumbnail}, caption}, {quoted: m})
    await conn.sendMessage(m.chat, {audio: {url: result.url}, mimetype: 'audio/mpeg', fileName: result.title + '.mp3'}, {quoted: m})
    await m.react('✅')
}

handler.help = ['song <song>']
handler.tags = ['downloader']
handler.command = ['song']
export default handler