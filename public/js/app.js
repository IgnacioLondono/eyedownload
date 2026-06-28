const urlInput = document.getElementById('url-input');
const analyzeBtn = document.getElementById('analyze-btn');
const inputError = document.getElementById('input-error');
const previewSection = document.getElementById('preview-section');
const previewThumb = document.getElementById('preview-thumb');
const previewDuration = document.getElementById('preview-duration');
const previewTitle = document.getElementById('preview-title');
const previewUploader = document.getElementById('preview-uploader');
const platformBadge = document.getElementById('platform-badge');
const platformIcon = document.getElementById('platform-icon');
const videoOptions = document.getElementById('video-options');
const audioOptions = document.getElementById('audio-options');
const qualitySelect = document.getElementById('quality-select');
const videoFormatSelect = document.getElementById('video-format-select');
const audioFormatSelect = document.getElementById('audio-format-select');
const audioQualitySelect = document.getElementById('audio-quality-select');
const downloadBtn = document.getElementById('download-btn');
const progressSection = document.getElementById('progress-section');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const progressError = document.getElementById('progress-error');
const downloadFileBtn = document.getElementById('download-file-btn');
const tabs = document.querySelectorAll('.tab');

let currentUrl = '';
let currentType = 'video';
let currentJobId = null;
let pollInterval = null;
let analyzing = false;
let cachedVideoFormats = [];
let cachedAudioFormats = [];
let cachedQualityPresets = [];

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  twitter: 'Twitter / X',
  facebook: 'Facebook',
  vimeo: 'Vimeo',
  twitch: 'Twitch',
  soundcloud: 'SoundCloud',
  reddit: 'Reddit',
  dailymotion: 'Dailymotion',
  bilibili: 'Bilibili',
  generic: 'Enlace',
};

const PLATFORM_ICONS = {
  youtube: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2.2c2.7 0 3 0 4 .1 1.1.1 1.8.2 2.5.5.7.2 1.3.6 1.9 1.2.6.6 1 1.2 1.2 1.9.3.7.4 1.4.5 2.5.1 1.1.1 1.3.1 4s0 3-.1 4c-.1 1.1-.2 1.8-.5 2.5-.2.7-.6 1.3-1.2 1.9-.6.6-1.2 1-1.9 1.2-.7.3-1.4.4-2.5.5-1.1.1-1.3.1-4 .1s-3 0-4-.1c-1.1-.1-1.8-.2-2.5-.5-.7-.2-1.3-.6-1.9-1.2-.6-.6-1-1.2-1.2-1.9-.3-.7-.4-1.4-.5-2.5-.1-1.1-.1-1.3-.1-4s0-3 .1-4c.1-1.1.2-1.8.5-2.5.2-.7.6-1.3 1.2-1.9.6-.6 1.2-1 1.9-1.2.7-.3 1.4-.4 2.5-.5 1-.1 1.3-.1 4-.1zm0 1.8c-2.6 0-2.9 0-3.9.1-1 .1-1.6.2-2 .4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.2.4-.3 1-.4 2-.1 1-.1 1.3-.1 3.9s0 2.9.1 3.9c.1 1 .2 1.6.4 2 .2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .3 2 .4 1 .1 1.3.1 3.9.1s2.9 0 3.9-.1c1-.1 1.6-.2 2-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.3-1 .4-2 .1-1 .1-1.3.1-3.9s0-2.9-.1-3.9c-.1-1-.2-1.6-.4-2-.2-.5-.4-.9-.8-1.3-.4-.4-.8-.6-1.3-.8-.4-.2-1-.3-2-.4-1-.1-1.3-.1-3.9-.1zm0 3.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6zm0 1.8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm6.4-3.7a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M18.2 2.25h3.5l-7.6 8.7 9 11.8h-7l-5.5-7.2-6.3 7.2H1.4l8.1-9.3L1 2.25h7.2l5 6.6 5-6.6zm-1.2 18.5h1.9L7.1 4.13H5.1l11.9 16.62z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.9V12h2.2V9.8c0-2.2 1.3-3.4 3.3-3.4.9 0 1.9.2 1.9.2v2.1h-1.1c-1.1 0-1.4.7-1.4 1.4V12h2.4l-.4 2.5h-2v8.4A12 12 0 0 0 24 12z"/></svg>',
  vimeo: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M23.9 6.6c-.1 2.3-1.7 5.4-4.8 9.3-3.2 4.1-5.9 6.2-8.1 6.2-1.4 0-2.5-1.3-3.4-3.9-.6-2.4-1.2-4.8-1.8-7.2-1-3.5-2-5.3-3.1-5.3-.2 0-1 .5-2.5 1.4L0 6.5c1.6-1.4 3.1-2.8 4.6-4.2 2.1-1.8 3.6-2.8 4.6-2.9 2.4-.2 3.9 1.4 4.5 4.9.6 3.8 1 6.1 1.2 7 .8 3.7 1.7 5.5 2.7 5.4 1-.1 2.4-1.6 4.2-4.5 1.8-2.9 2.7-5.1 2.8-6.6.1-2.5-1.8-3.7-5.6-3.7-.5 0-1 0-1.5.1 3-1.8 5.8-2.7 8.4-2.7 3.2-.1 4.7 1.7 4.6 5.2z"/></svg>',
  twitch: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M11.6 11.2v2.5h2.1v-2.5h-2.1zm4.9 0v2.5H19v-2.5h-2.5zM6 0L1.3 4.7v14.6h5.1V24l4.7-4.7h3.7L22.7 12V0H6zm14.7 11.2l-3.7 3.7h-3.7l-3.3 3.3v-3.3H6V2.1h14.7v9.1z"/></svg>',
  soundcloud: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M1.2 13.5c-.3 0-.5.2-.5.5v2.9c0 .3.2.5.5.5.3 0 .5-.2.5-.5v-2.9c0-.3-.2-.5-.5-.5zm1.8 0c-.3 0-.5.2-.5.5v3.5c0 .3.2.5.5.5.3 0 .5-.2.5-.5v-3.5c0-.3-.2-.5-.5-.5zm1.8-.4c-.3 0-.5.2-.5.5v4.3c0 .3.2.5.5.5.3 0 .5-.2.5-.5v-4.3c0-.3-.2-.5-.5-.5zm1.8-.5c-.3 0-.5.2-.5.5v5.3c0 .3.2.5.5.5.3 0 .5-.2.5-.5v-5.3c0-.3-.2-.5-.5-.5zm1.8-.6c-.3 0-.5.2-.5.5v6.5c0 .3.2.5.5.5.3 0 .5-.2.5-.5v-6.5c0-.3-.2-.5-.5-.5zm1.8-.7c-.3 0-.6.3-.6.6v7.7c0 .3.3.6.6.6.3 0 .6-.3.6-.6v-7.7c0-.3-.3-.6-.6-.6zm1.8-.8c-.4 0-.7.3-.7.7v9.1c0 .4.3.7.7.7.4 0 .7-.3.7-.7v-9.1c0-.4-.3-.7-.7-.7zm2.5-.9c-.4 0-.8.4-.8.8v10.7c0 .4.4.8.8.8.4 0 .8-.4.8-.8V12.4c0-.4-.4-.8-.8-.8zm2.6-1.1c-.5 0-.9.4-.9.9v13.1c0 .5.4.9.9.9.5 0 .9-.4.9-.9V12.2c0-.5-.4-.9-.9-.9zm3.1-1.3c-.5 0-1 .5-1 1v15.5c0 .5.5 1 1 1s1-.5 1-1V11.9c0-.5-.5-1-1-1zm3.2-1.5c-.6 0-1.1.5-1.1 1.1v18.1c0 .6.5 1.1 1.1 1.1.6 0 1.1-.5 1.1-1.1V10.5c0-.6-.5-1.1-1.1-1.1zm3.4-1.8c-.7 0-1.2.5-1.2 1.2v21.5c0 .7.5 1.2 1.2 1.2.7 0 1.2-.5 1.2-1.2V9.9c0-.7-.5-1.2-1.2-1.2z"/></svg>',
  reddit: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5 12.5c0-.3-.2-.5-.5-.5h-1.3a7.2 7.2 0 0 0 .2-1.6c0-1.7-1.4-3-3-3-.8 0-1.5.3-2.1.8l-3.5-2.5a.5.5 0 0 0-.7.1l-1 1.4a.5.5 0 0 0 .1.7l2.6 1.9a3 3 0 0 0-1.3 2.5c0 .6.2 1.1.5 1.6H7.5c-.3 0-.5.2-.5.5s.2.5.5.5h.3a5 5 0 0 0-.1.8c0 2.5 2.9 4.5 6.5 4.5s6.5-2 6.5-4.5c0-.3 0-.5-.1-.8h.3c.3 0 .5-.2.5-.5z"/></svg>',
  dailymotion: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M14.6 3.2v17.6c3.1-.4 5.5-3 5.5-6.3V9.5c0-3.3-2.4-6-5.5-6.3zM3.2 8.8v6.4c0 3.3 2.4 6 5.5 6.3V3.2c-3.1.4-5.5 3-5.5 6.6z"/></svg>',
  generic: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l1-1a5 5 0 0 0-7.5-6.5l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-1 1a5 5 0 0 0 7.5 6.5l1-1"/></svg>',
};

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function detectPlatformFromUrl(url) {
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

function cleanYouTubeUrlClient(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
    if (host.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        if (id) return `https://www.youtube.com/watch?v=${id}`;
      }
    }
  } catch {
    /* ignore */
  }
  return url;
}

function normalizeUrlClient(input) {
  const raw = extractUrlFromText(input);
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (/youtube\.com|youtu\.be|m\.youtube\.com/.test(host)) {
      return cleanYouTubeUrlClient(raw);
    }
    if (host.includes('tiktok.com')) {
      parsed.search = '';
      parsed.hash = '';
      return parsed.href;
    }
    if (host === 'instagram.com') {
      parsed.pathname = parsed.pathname.replace(/\/reels\//, '/reel/');
      parsed.search = '';
      parsed.hash = '';
      return parsed.href;
    }
    if (host === 'x.com' || host === 'twitter.com') {
      parsed.hostname = 'twitter.com';
      parsed.search = '';
      parsed.hash = '';
      return parsed.href;
    }
    if (host === 'dai.ly') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      if (id) return `https://www.dailymotion.com/video/${id}`;
    }
    parsed.hash = '';
    return parsed.href;
  } catch {
    return raw;
  }
}

function extractUrlFromText(input) {
  const text = String(input || '').trim();
  const match = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
  if (match) return match[0].replace(/[.,;:!?)]+$/, '');
  return text;
}

function looksLikeContentUrl(url) {
  const u = url.toLowerCase();
  if (/tiktok\.com\/?(\?|#|$)/.test(u)) return false;
  if (/youtube\.com\/?(\?|#|$)/.test(u)) return false;
  if (/instagram\.com\/?(\?|#|$)/.test(u)) return false;
  if (/twitter\.com\/?(\?|#|$)/.test(u) || /x\.com\/?(\?|#|$)/.test(u)) return false;
  if (/facebook\.com\/?(\?|#|$)/.test(u)) return false;
  if (/vimeo\.com\/?(\?|#|$)/.test(u)) return false;
  if (/twitch\.tv\/?(\?|#|$)/.test(u)) return false;
  if (/soundcloud\.com\/?(\?|#|$)/.test(u)) return false;
  return /https?:\/\//.test(u) && u.length > 20;
}

function setPlatformBadge(platform) {
  const key = PLATFORM_ICONS[platform] ? platform : 'generic';
  const label = PLATFORM_LABELS[key] || 'Enlace';

  platformBadge.className = `platform-badge ${key}`;
  platformBadge.title = label;
  platformIcon.innerHTML = PLATFORM_ICONS[key];
  platformBadge.classList.remove('hidden');
}

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) {
    if (res.status === 404) throw new Error('Servidor no encontrado. Abre http://localhost:7842 (no el archivo HTML directamente).');
    throw new Error('El servidor no respondio. Ejecuta npm start o iniciar.bat.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Respuesta invalida del servidor. Reinicia EyeDownload con npm start.');
  }
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.querySelector('.btn-text').classList.toggle('hidden', loading);
  btn.querySelector('.btn-loader').classList.toggle('hidden', !loading);
}

function showError(el, msg) {
  if (msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  const decimals = i === 0 ? 0 : size >= 100 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[i]}`;
}

function filterFormatsByQuality(formats, quality) {
  if (quality === 'best') return formats;

  let height = parseInt(quality, 10);
  if (!Number.isFinite(height)) {
    const legacy = { '1080': 1080, '720': 720, '480': 480, '360': 360 };
    height = legacy[quality];
  }
  if (!height) return formats;

  const exact = formats.filter((f) => f.height === height);
  if (exact.length) return exact;

  return formats.filter((f) => (f.height || 0) > 0 && (f.height || 0) <= height);
}

function getAutoFormatLabel(quality) {
  const preset = cachedQualityPresets.find((p) => p.value === quality);
  const size = formatFileSize(preset?.filesize);
  return size ? `Automatico (recomendado) — ${size}` : 'Automatico (recomendado)';
}

function updateFormatSelectForQuality() {
  const quality = qualitySelect.value;
  const filtered = filterFormatsByQuality(cachedVideoFormats, quality);
  const suggested = filtered[0]?.formatId || null;
  populateSelect(videoFormatSelect, filtered, suggested, getAutoFormatLabel(quality));
}

function updateAudioSelectForQuality() {
  populateSelect(audioQualitySelect, cachedAudioFormats, cachedAudioFormats[0]?.formatId, 'Mejor audio disponible');
}

function populateSelect(select, items, suggestedId, emptyLabel = 'Automatico (recomendado)') {
  select.innerHTML = `<option value="">${emptyLabel}</option>`;
  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = item.formatId ?? item.value ?? '';
    opt.textContent = item.label;
    if (item.formatId === suggestedId || item.value === suggestedId) opt.selected = true;
    select.appendChild(opt);
  }
}

function populateQualitySelect(presets) {
  qualitySelect.innerHTML = '';
  for (const preset of presets) {
    const opt = document.createElement('option');
    opt.value = preset.value;
    opt.textContent = preset.label;
    qualitySelect.appendChild(opt);
  }
}

function populateAudioFormatSelect(options, selected = 'mp3') {
  audioFormatSelect.innerHTML = '';
  for (const opt of options) {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    if (opt.value === selected) el.selected = true;
    audioFormatSelect.appendChild(el);
  }
}

function showPreviewLoading(url) {
  previewSection.classList.remove('hidden');
  previewTitle.textContent = 'Analizando enlace...';
  previewUploader.textContent = 'Esto puede tardar unos segundos';
  previewDuration.textContent = '';
  previewThumb.src = '';
  previewThumb.alt = 'Cargando miniatura';
  previewThumb.classList.add('loading');
  downloadBtn.disabled = true;
  setPlatformBadge(detectPlatformFromUrl(url));
}

function updatePreview(data) {
  previewThumb.classList.remove('loading');
  previewThumb.src = data.thumbnail || '';
  previewThumb.alt = data.title || 'Miniatura del video';
  previewTitle.textContent = data.title || 'Sin titulo';
  previewUploader.textContent = data.uploader || '';
  previewDuration.textContent = formatDuration(data.duration);
  setPlatformBadge(data.platform || detectPlatformFromUrl(currentUrl));

  previewThumb.onerror = () => {
    previewThumb.classList.remove('loading');
    previewThumb.src = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect fill="#1a1a26" width="320" height="180"/><text x="160" y="95" text-anchor="middle" fill="#9898a8" font-family="sans-serif" font-size="14">Sin miniatura</text></svg>'
    );
  };
}

async function fetchWithTimeout(url, options, ms = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado. Prueba el enlace directo del video.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function analyzeUrl() {
  const raw = urlInput.value.trim();
  showError(inputError, null);

  if (!raw) {
    showError(inputError, 'Introduce una URL valida');
    return;
  }

  if (analyzing) return;

  const url = normalizeUrlClient(raw);
  if (url !== raw) urlInput.value = url;

  analyzing = true;

  setLoading(analyzeBtn, true);
  downloadBtn.disabled = true;
  showPreviewLoading(url);

  try {
    const res = await fetchWithTimeout('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }, 60000);

    const data = await parseJsonResponse(res);

    if (!res.ok) {
      throw new Error(data.error || 'Error al analizar');
    }

    currentUrl = data.webpage_url || url;
    if (currentUrl !== urlInput.value) urlInput.value = currentUrl;
    updatePreview(data);

    cachedVideoFormats = data.formats.video || [];
    cachedAudioFormats = data.formats.audio || [];
    cachedQualityPresets = data.qualityPresets || [{ value: 'best', label: 'Mejor calidad disponible' }];

    populateQualitySelect(cachedQualityPresets);
    updateFormatSelectForQuality();
    populateSelect(audioQualitySelect, cachedAudioFormats, data.suggested.audio, 'Mejor audio disponible');
    populateAudioFormatSelect(data.audioOutputOptions || [
      { value: 'mp3', label: 'MP3 (192 kbps)' },
      { value: 'm4a', label: 'M4A (AAC)' },
    ]);

    resetDownloadState();
  } catch (err) {
    if (err.name !== 'AbortError') {
      previewSection.classList.add('hidden');
      showError(inputError, err.message);
    }
  } finally {
    analyzing = false;
    setLoading(analyzeBtn, false);
  }
}

function resetDownloadState() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  currentJobId = null;
  progressSection.classList.add('hidden');
  progressFill.style.width = '0%';
  progressText.textContent = 'Preparando descarga...';
  showError(progressError, null);
  downloadFileBtn.classList.add('hidden');
  downloadBtn.classList.remove('hidden');
  downloadBtn.disabled = false;
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentType = tab.dataset.type;
    videoOptions.classList.toggle('hidden', currentType !== 'video');
    audioOptions.classList.toggle('hidden', currentType !== 'audio');
  });
});

async function startDownload() {
  if (!currentUrl) return;

  downloadBtn.disabled = true;
  progressSection.classList.remove('hidden');
  showError(progressError, null);
  downloadFileBtn.classList.add('hidden');
  progressFill.style.width = '5%';
  progressText.textContent = 'Iniciando descarga...';

  const body = {
    url: currentUrl,
    type: currentType,
  };

  if (currentType === 'video') {
    body.quality = qualitySelect.value;
    const formatId = videoFormatSelect.value;
    if (formatId) body.formatId = formatId;
  } else {
    body.audioFormat = audioFormatSelect.value;
    const formatId = audioQualitySelect.value;
    if (formatId) body.formatId = formatId;
  }

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await parseJsonResponse(res);
    if (!res.ok) throw new Error(data.error || 'Error al iniciar descarga');

    currentJobId = data.jobId;
    pollProgress();
  } catch (err) {
    showError(progressError, err.message);
    downloadBtn.disabled = false;
  }
}

function pollProgress() {
  let fakeProgress = 5;

  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/download/${currentJobId}/status`);
      const data = await parseJsonResponse(res);

      if (data.status === 'completed') {
        clearInterval(pollInterval);
        pollInterval = null;
        progressFill.style.width = '100%';
        progressText.textContent = `Listo: ${data.filename}`;
        downloadFileBtn.classList.remove('hidden');
        downloadBtn.classList.add('hidden');
        return;
      }

      if (data.status === 'error') {
        clearInterval(pollInterval);
        pollInterval = null;
        showError(progressError, data.error || 'Error en la descarga');
        downloadBtn.disabled = false;
        return;
      }

      fakeProgress = Math.min(fakeProgress + 3, 90);
      progressFill.style.width = `${fakeProgress}%`;
      progressText.textContent = 'Descargando y procesando...';
    } catch {
      /* retry on next tick */
    }
  }, 1500);
}

function saveFile() {
  if (!currentJobId) return;
  window.location.href = `/api/download/${currentJobId}/file`;
}

qualitySelect.addEventListener('change', updateFormatSelectForQuality);

analyzeBtn.addEventListener('click', analyzeUrl);
downloadBtn.addEventListener('click', startDownload);
downloadFileBtn.addEventListener('click', saveFile);

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') analyzeUrl();
});

urlInput.addEventListener('paste', () => {
  setTimeout(() => {
    const url = normalizeUrlClient(urlInput.value);
    if (url !== urlInput.value) urlInput.value = url;
    if (looksLikeContentUrl(url)) analyzeUrl();
  }, 100);
});

if (window.location.protocol === 'file:') {
  showError(inputError, 'Abre EyeDownload desde http://localhost:7842 (ejecuta npm start). No abras el HTML directamente.');
}
