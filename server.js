const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const youtubedl = require('youtube-dl-exec');
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

function getYtDlpOptions(extra = {}) {
  return {
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
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

function buildFormatSelector(type, formatId, quality) {
  if (type === 'audio') {
    if (formatId) return formatId;
    return 'bestaudio/best';
  }

  if (formatId) {
    return `${formatId}+bestaudio/best`;
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
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL requerida' });
  }

  try {
    const info = await youtubedl(url.trim(), getYtDlpOptions({
      dumpSingleJson: true,
      skipDownload: true,
    }));

    const { video, audio } = parseFormats(info.formats);
    const platform = detectPlatform(url, info.extractor_key || info.extractor);

    res.json({
      id: info.id,
      title: info.title,
      thumbnail: getBestThumbnail(info),
      duration: info.duration,
      uploader: info.uploader || info.channel,
      webpage_url: info.webpage_url || url,
      platform,
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
      error: 'No se pudo analizar el enlace. Verifica la URL o que el contenido sea accesible.',
      detail: err.stderr || err.message,
    });
  }
});

app.post('/api/download', async (req, res) => {
  const { url, type = 'video', quality = 'best', formatId, audioFormat = 'mp3' } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL requerida' });
  }

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

  const formatSelector = buildFormatSelector(type, formatId, quality);
  const postprocessors = buildPostProcessors(type, audioFormat);

  const options = getYtDlpOptions({
    format: formatSelector,
    output: outputTemplate,
    mergeOutputFormat: type === 'video' ? 'mp4' : undefined,
    postprocessors,
    progress: true,
  });

  youtubedl(url.trim(), options)
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
        const info = await youtubedl(url.trim(), getYtDlpOptions({ dumpSingleJson: true, skipDownload: true }));
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
