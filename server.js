const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const youtubedl = require('youtube-dl-exec');

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const ffmpegPath = require('ffmpeg-static');

if (ffmpegPath) {
  process.env.PATH = path.dirname(ffmpegPath) + path.delimiter + process.env.PATH;
}

const app = express();
const PORT = process.env.PORT || 7842;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

const activeJobs = new Map();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function sanitizeFilename(name) {
  return (name || 'descarga')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'descarga';
}

function getBestThumbnail(info) {
  if (Array.isArray(info.thumbnails) && info.thumbnails.length) {
    const sorted = [...info.thumbnails].sort((a, b) => (b.height || 0) - (a.height || 0));
    return sorted[0]?.url || info.thumbnail;
  }
  return info.thumbnail || null;
}

function detectPlatform(url, extractor) {
  const key = (extractor || '').toLowerCase().replace(/[^a-z]/g, '');

  const fromExtractor = {
    youtube: 'youtube',
    tiktok: 'tiktok',
    instagram: 'instagram',
    twitter: 'twitter',
    facebook: 'facebook',
    vimeo: 'vimeo',
    twitch: 'twitch',
    twitchclips: 'twitch',
    soundcloud: 'soundcloud',
    reddit: 'reddit',
    dailymotion: 'dailymotion',
    bilibili: 'bilibili',
  };

  if (fromExtractor[key]) return fromExtractor[key];

  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('vimeo.com')) return 'vimeo';
  if (u.includes('twitch.tv')) return 'twitch';
  if (u.includes('soundcloud.com')) return 'soundcloud';
  if (u.includes('reddit.com')) return 'reddit';
  if (u.includes('dailymotion.com')) return 'dailymotion';

  return 'generic';
}

function extractUrl(input) {
  const text = String(input || '').trim();
  const match = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
  if (match) return match[0].replace(/[.,;:!?)]+$/, '');
  return text;
}

function normalizeUrl(input) {
  const raw = extractUrl(input);
  try {
    const parsed = new URL(raw);
    if (parsed.hostname === 'm.tiktok.com') parsed.hostname = 'www.tiktok.com';
    if (parsed.hostname === 'mobile.twitter.com') parsed.hostname = 'twitter.com';
    parsed.hash = '';
    return parsed.href;
  } catch {
    return raw;
  }
}

function isContentUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '') || '/';

    if (host === 'tiktok.com' || host.startsWith('vm.tiktok.com') || host.startsWith('vt.tiktok.com')) {
      if (host.startsWith('vm.') || host.startsWith('vt.')) return true;
      if (path.includes('/video/')) return true;
      if (path.startsWith('/t/')) return true;
      return path !== '/' && !['/foryou', '/following', '/live'].includes(path);
    }
    if (host === 'youtube.com' || host === 'youtu.be') {
      return host === 'youtu.be' || u.searchParams.has('v') || path.startsWith('/shorts/') || path.startsWith('/live/');
    }
    if (host === 'instagram.com') {
      return /^\/(reel|p|tv|reels|stories)\//.test(path);
    }
    if (host === 'twitter.com' || host === 'x.com') {
      return /\/status\/\d+/.test(path);
    }
    if (host === 'facebook.com' || host === 'fb.watch') {
      return path !== '/' && path !== '/watch';
    }
    if (host === 'fb.watch') return true;

    return path !== '/' && path.length > 1;
  } catch {
    return false;
  }
}

function validateUrlInput(input) {
  const url = normalizeUrl(input);

  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, error: 'Introduce un enlace valido que empiece con http:// o https://' };
  }

  if (!isContentUrl(url)) {
    const platform = detectPlatform(url);
    const hints = {
      tiktok: 'Pega el enlace directo del video de TikTok (Compartir > Copiar enlace), no la pagina principal.',
      youtube: 'Pega el enlace del video de YouTube, no la pagina de inicio.',
      instagram: 'Pega el enlace de un Reel, publicacion o historia de Instagram.',
      twitter: 'Pega el enlace de un tweet que contenga el video.',
      facebook: 'Pega el enlace directo del video de Facebook.',
    };
    return {
      ok: false,
      error: hints[platform] || 'Pega el enlace directo del video o publicacion, no la pagina principal del sitio.',
    };
  }

  return { ok: true, url };
}

function translateYtDlpError(stderr, url) {
  const msg = String(stderr || '');
  const platform = detectPlatform(url);

  if (/Unsupported URL/i.test(msg)) {
    const hints = {
      tiktok: 'Enlace de TikTok invalido. Usa Compartir > Copiar enlace del video.',
      instagram: 'Enlace de Instagram invalido. Usa el enlace del Reel o publicacion.',
      twitter: 'Enlace invalido. Usa el enlace del tweet con el video.',
    };
    return hints[platform] || 'URL no soportada. Pega el enlace directo del contenido.';
  }
  if (/Video unavailable|Private video|This video is not available/i.test(msg)) {
    return 'El video no esta disponible, es privado o tiene restricciones regionales.';
  }
  if (/Sign in to confirm your age/i.test(msg)) {
    return 'El contenido requiere verificacion de edad en la plataforma original.';
  }
  if (/HTTP Error 403|403 Forbidden/i.test(msg)) {
    return 'La plataforma bloqueo la solicitud. Intenta de nuevo o prueba otro enlace.';
  }

  return 'No se pudo analizar el enlace. Verifica la URL o que el contenido sea accesible.';
}

function getYtDlpOptions(extra = {}) {
  const platform = extra._platform;
  delete extra._platform;

  const headers = ['Referer:https://www.tiktok.com/', 'Accept-Language:en-US,en;q=0.9'];
  if (platform === 'instagram') headers[0] = 'Referer:https://www.instagram.com/';
  if (platform === 'twitter') headers[0] = 'Referer:https://twitter.com/';
  if (platform === 'facebook') headers[0] = 'Referer:https://www.facebook.com/';

  return {
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    geoBypass: true,
    userAgent: BROWSER_UA,
    addHeader: headers,
    ...extra,
  };
}

function parseFormats(rawFormats) {
  if (!Array.isArray(rawFormats)) return { video: [], audio: [] };

  const video = [];
  const audio = [];
  const seenVideo = new Set();
  const seenAudio = new Set();

  for (const f of rawFormats) {
    if (!f || f.format_id === undefined) continue;

    const hasVideo = f.vcodec && f.vcodec !== 'none';
    const hasAudio = f.acodec && f.acodec !== 'none';
    const ext = f.ext || 'unknown';
    const note = f.format_note || '';
    const height = f.height || 0;
    const fps = f.fps || 0;
    const tbr = f.tbr || f.abr || 0;

    if (hasVideo && !hasAudio) {
      const key = `${height}-${ext}-${note}`;
      if (!seenVideo.has(key)) {
        seenVideo.add(key);
        video.push({
          formatId: f.format_id,
          ext,
          height,
          fps,
          note,
          label: height
            ? `${height}p${fps > 30 ? ` ${fps}fps` : ''} (${ext.toUpperCase()})${note ? ` — ${note}` : ''}`
            : `${ext.toUpperCase()}${note ? ` — ${note}` : ''}`,
          filesize: f.filesize || f.filesize_approx || null,
        });
      }
    } else if (hasVideo && hasAudio) {
      const key = `av-${height}-${ext}-${note}`;
      if (!seenVideo.has(key)) {
        seenVideo.add(key);
        video.push({
          formatId: f.format_id,
          ext,
          height,
          fps,
          note,
          label: height
            ? `${height}p (${ext.toUpperCase()}) — video+audio${note ? ` — ${note}` : ''}`
            : `${ext.toUpperCase()} — video+audio${note ? ` — ${note}` : ''}`,
          filesize: f.filesize || f.filesize_approx || null,
        });
      }
    } else if (hasAudio && !hasVideo) {
      const key = `${tbr}-${ext}-${note}`;
      if (!seenAudio.has(key)) {
        seenAudio.add(key);
        audio.push({
          formatId: f.format_id,
          ext,
          abr: tbr,
          note,
          label: `${Math.round(tbr)} kbps (${ext.toUpperCase()})${note ? ` — ${note}` : ''}`,
          filesize: f.filesize || f.filesize_approx || null,
        });
      }
    }
  }

  video.sort((a, b) => (b.height || 0) - (a.height || 0));
  audio.sort((a, b) => (b.abr || 0) - (a.abr || 0));

  return { video, audio };
}

function buildFormatSelector(type, formatId, quality, platform) {
  if (type === 'audio') {
    if (formatId) return formatId;
    return 'bestaudio/best';
  }

  if (formatId) {
    return platform === 'youtube' ? `${formatId}+bestaudio/best` : formatId;
  }

  if (platform !== 'youtube') {
    const genericMap = {
      best: 'bestvideo+bestaudio/best',
      '1080': 'best[height<=1080]/best',
      '720': 'best[height<=720]/best',
      '480': 'best[height<=480]/best',
      '360': 'best[height<=360]/best',
    };
    return genericMap[quality] || genericMap.best;
  }

  const qualityMap = {
    best: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '1080': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]',
    '720': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]',
    '480': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]',
    '360': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]',
  };

  return qualityMap[quality] || qualityMap.best;
}

function buildPostProcessors(type, audioFormat) {
  if (type === 'audio') {
    const fmt = audioFormat === 'm4a' ? 'm4a' : 'mp3';
    return [{ key: 'FFmpegExtractAudio', preferredcodec: fmt, preferredquality: '192' }];
  }
  return [{ key: 'FFmpegVideoConvertor', preferedformat: 'mp4' }];
}

function cleanupOldFiles() {
  const maxAge = 60 * 60 * 1000;
  const now = Date.now();

  for (const file of fs.readdirSync(DOWNLOADS_DIR)) {
    const filePath = path.join(DOWNLOADS_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
      }
    } catch {
      /* ignore */
    }
  }
}

setInterval(cleanupOldFiles, 15 * 60 * 1000);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ffmpeg: !!ffmpegPath });
});

app.post('/api/info', async (req, res) => {
  const validation = validateUrlInput(req.body?.url);

  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const url = validation.url;
  const platform = detectPlatform(url);

  try {
    const info = await youtubedl(url, getYtDlpOptions({
      _platform: platform,
      dumpSingleJson: true,
      skipDownload: true,
      noPlaylist: true,
    }));

    const { video, audio } = parseFormats(info.formats);
    const resolvedPlatform = detectPlatform(url, info.extractor_key || info.extractor);

    res.json({
      id: info.id,
      title: info.title,
      thumbnail: getBestThumbnail(info),
      duration: info.duration,
      uploader: info.uploader || info.channel,
      webpage_url: info.webpage_url || url,
      platform: resolvedPlatform,
      extractor: info.extractor_key || info.extractor || null,
      formats: { video, audio },
      suggested: {
        video: video[0]?.formatId || null,
        audio: audio[0]?.formatId || null,
      },
    });
  } catch (err) {
    console.error('Error info:', err.message);
    res.status(422).json({
      error: translateYtDlpError(err.stderr || err.message, url),
      detail: err.stderr || err.message,
    });
  }
});

app.post('/api/download', async (req, res) => {
  const validation = validateUrlInput(req.body?.url);

  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const url = validation.url;
  const { type = 'video', quality = 'best', formatId, audioFormat = 'mp3' } = req.body;
  const platform = detectPlatform(url);

  const jobId = crypto.randomBytes(8).toString('hex');
  const outputTemplate = path.join(DOWNLOADS_DIR, `${jobId}.%(ext)s`);

  const job = {
    id: jobId,
    status: 'starting',
    progress: 0,
    title: null,
    filename: null,
    error: null,
  };

  activeJobs.set(jobId, job);

  res.json({ jobId });

  const formatSelector = buildFormatSelector(type, formatId, quality, platform);
  const postprocessors = buildPostProcessors(type, audioFormat);

  const options = getYtDlpOptions({
    _platform: platform,
    format: formatSelector,
    output: outputTemplate,
    mergeOutputFormat: type === 'video' ? 'mp4' : undefined,
    postprocessors,
    progress: true,
    noPlaylist: true,
  });

  youtubedl(url, options)
    .then(async (output) => {
      let filePath = typeof output === 'string' ? output.trim() : null;

      if (!filePath || !fs.existsSync(filePath)) {
        const files = fs.readdirSync(DOWNLOADS_DIR).filter((f) => f.startsWith(jobId));
        if (files.length === 0) throw new Error('Archivo no encontrado tras la descarga');
        filePath = path.join(DOWNLOADS_DIR, files[0]);
      }

      const ext = path.extname(filePath);
      let title = 'descarga';

      try {
        const info = await youtubedl(url, getYtDlpOptions({ _platform: platform, dumpSingleJson: true, skipDownload: true }));
        title = sanitizeFilename(info.title);
      } catch {
        /* use default title */
      }

      const finalName = `${title}${ext}`;
      const finalPath = path.join(DOWNLOADS_DIR, `${jobId}${ext}`);

      if (filePath !== finalPath) {
        fs.renameSync(filePath, finalPath);
      }

      job.status = 'completed';
      job.progress = 100;
      job.filename = finalName;
      job.filePath = finalPath;
      job.title = title;
    })
    .catch((err) => {
      console.error('Error download:', err.message);
      job.status = 'error';
      job.error = err.stderr || err.message || 'Error desconocido';
    });
});

app.get('/api/download/:jobId/status', (req, res) => {
  const job = activeJobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Trabajo no encontrado' });
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    title: job.title,
    filename: job.filename,
    error: job.error,
  });
});

app.get('/api/download/:jobId/file', (req, res) => {
  const job = activeJobs.get(req.params.jobId);

  if (!job || job.status !== 'completed' || !job.filePath) {
    return res.status(404).json({ error: 'Archivo no disponible' });
  }

  if (!fs.existsSync(job.filePath)) {
    return res.status(404).json({ error: 'Archivo expirado o eliminado' });
  }

  res.download(job.filePath, job.filename, (err) => {
    if (err) console.error('Error enviando archivo:', err.message);
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  EyeDownload corriendo en http://localhost:${PORT}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  El puerto ${PORT} ya esta en uso.`);
    console.error(`  EyeDownload puede que ya este activo: http://localhost:${PORT}`);
    console.error(`  Cierra la otra ventana o vuelve a ejecutar iniciar.bat\n`);
    process.exit(1);
  }
  throw err;
});
