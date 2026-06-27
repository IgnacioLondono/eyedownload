# EyeDownload

Descargador universal de videos y audio desde la web. Compatible con YouTube, TikTok, Instagram, Twitter/X, Facebook, Vimeo, Twitch, SoundCloud y mas de 1000 sitios.

## Caracteristicas

- Analiza cualquier enlace y muestra titulo, miniatura y duracion
- Descarga en **MP4** (video) con calidad configurable (360p a 1080p o la mejor disponible)
- Extrae **MP3** o **M4A** (solo audio)
- Seleccion de formato especifico cuando la plataforma lo permite
- Interfaz web moderna en espanol

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior

No necesitas instalar yt-dlp ni ffmpeg por separado: se descargan automaticamente con las dependencias npm.

## Instalacion

**Opcion rapida (Windows):** doble clic en `instalar.bat`

**Manual:**

```bash
cd "Descargador web"
set YOUTUBE_DL_SKIP_PYTHON_CHECK=1
npm install
```

> La variable `YOUTUBE_DL_SKIP_PYTHON_CHECK=1` evita que falle la instalacion si no tienes Python.

## Uso

```bash
npm start
```

Abre **http://localhost:7842** en tu navegador (o ejecuta `iniciar.bat` en Windows).

1. Pega la URL del video o audio
2. Pulsa **Analizar**
3. Elige **Video** o **Solo audio**, calidad y formato
4. Pulsa **Descargar** y luego **Guardar archivo**

## API

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/info` | Obtiene metadatos y formatos disponibles |
| POST | `/api/download` | Inicia una descarga |
| GET | `/api/download/:id/status` | Estado del trabajo |
| GET | `/api/download/:id/file` | Descarga el archivo final |

## Notas

- Los archivos temporales se eliminan automaticamente tras 1 hora
- Usa la herramienta solo para contenido que tengas derecho a descargar
- Algunas plataformas pueden bloquear descargas por region o login

## Puerto personalizado

```bash
set PORT=8080 && npm start
```

## Despliegue en Portainer

Repositorio: [github.com/IgnacioLondono/eyedownload](https://github.com/IgnacioLondono/eyedownload)

### Opcion A: Stack desde Git

1. En Portainer ve a **Stacks** > **Add stack**
2. Nombre: `eyedownload`
3. **Build method**: Repository
4. Repository URL: `https://github.com/IgnacioLondono/eyedownload.git`
5. Compose path: `docker-compose.yml`
6. Deploy the stack

### Opcion B: Stack con Web editor

Pega el contenido de `docker-compose.yml` en el editor web de Portainer y despliega.

### Acceso

La app quedara disponible en `http://<tu-servidor>:7842`.

Variables utiles:

| Variable | Default | Descripcion |
|----------|---------|-------------|
| `PORT` | `7842` | Puerto publicado en el host |

### Docker manual

```bash
docker compose up -d --build
```

