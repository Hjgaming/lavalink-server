# 🎵 Lavalink Server

<div align="center">

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)

**A production-ready Lavalink audio streaming node for Discord bots with full Render deployment support**

[Features](#-features) • [Quick Deploy](#-quick-deploy-to-render) • [Manual Setup](#-manual-deployment) • [Configuration](#-configuration) • [Usage](#-usage) • [Security](#-security)

</div>

---

## ✨ Features

- 🚀 **One-Click Deploy** - Deploy to Render with a single click
- 📊 **Web Dashboard** - Beautiful real-time monitoring dashboard on the same port
- 🎵 **Multi-Source Support** - YouTube, Spotify, Apple Music, Deezer, SoundCloud, Bandcamp, Twitch, Vimeo
- 🔌 **Plugin System** - LavaSrc, LavaSearch, and SponsorBlock plugins pre-configured
- 🎚️ **Audio Filters** - Equalizer, Karaoke, Timescale, Tremolo, Vibrato, Distortion, and more
- 📊 **Monitoring** - Optional Prometheus metrics and Sentry error tracking
- 🔒 **Secure** - Environment variable-based configuration, no hardcoded secrets
- 🐳 **Docker Ready** - Optimized Dockerfile with health checks
- ⚡ **Production Optimized** - JVM tuning and performance settings for Render
- 📝 **Comprehensive Logs** - File rotation and proper log management

## 🚀 Quick Deploy to Render

The easiest way to get started:

1. **Click the Deploy to Render button above** or use this link:
   ```
   https://render.com/deploy?repo=https://github.com/Hjgaming/lavalink-server
   ```

2. **Configure your environment variables:**
   - `LAVALINK_SERVER_PASSWORD` - Set a strong password (auto-generated if left empty)
   - Optional: Add Spotify, Apple Music, or Deezer credentials for extended functionality

3. **Deploy!** Render will automatically build and deploy your Lavalink server

4. **Get your connection details:**
   - Host: `your-service-name.onrender.com`
   - Port: `443` (HTTPS) or `80` (HTTP)
   - Password: The one you set in step 2
   - Dashboard: `https://your-service-name.onrender.com/` (web interface)

## 📊 Web Dashboard

This Lavalink server includes a beautiful web dashboard that displays real-time metrics and server information. The dashboard runs on the **same port** as the Lavalink server, making it perfect for Render's single-port requirement.

### Accessing the Dashboard

Simply visit the root URL of your server:
- **Local**: `http://localhost:2333/`
- **Render**: `https://your-service-name.onrender.com/`

### Dashboard Features

The dashboard displays:

- **Server Information**: Version, uptime, build details, git commit info
- **Memory Metrics**: Used, allocated, free, and reservable memory with visual progress bars
- **CPU Usage**: Process and system CPU usage with core count
- **Player Statistics**: Active players, playing status, guild counts
- **Frame Statistics**: Frames sent/lost per minute, loss percentage
- **System Details**: JVM version, OS, thread counts
- **Auto-refresh**: Updates every 5 seconds automatically
- **Status Indicators**: Color-coded health status (green/yellow/red)
- **Mobile Responsive**: Works perfectly on all devices

### How It Works

The server uses a **dual-process architecture**:
1. **Nginx** (port 2333 or `$PORT`) - Serves the dashboard and proxies API requests
2. **Lavalink** (port 8080 internal) - Handles audio streaming and bot connections

Both processes run in the same Docker container managed by supervisord, ensuring both stay running together. This design is fully compatible with Render's single-port requirement.

### Technical Architecture

```
┌─────────────────────────────────────────┐
│  External Request (Port 2333)           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Nginx Proxy   │
         └────────┬───────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────▼─────┐    ┌─────▼────────┐
    │   HTML   │    │  Lavalink    │
    │ Dashboard│    │ (Port 8080)  │
    │   (/)    │    │   API/WS     │
    └──────────┘    └──────────────┘
```

- Root path `/` → Static dashboard files
- `/v4/*`, `/stats`, `/info`, `/version`, `/metrics` → Proxied to Lavalink
- WebSocket `/v4/websocket` → Proxied with WebSocket support

## 📦 Manual Deployment

### Using Docker

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Hjgaming/lavalink-server.git
   cd lavalink-server
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env and set your LAVALINK_SERVER_PASSWORD
   ```

3. **Build and run:**
   ```bash
   docker build -t lavalink-server .
   docker run -d \
     --name lavalink \
     -p 2333:2333 \
     -e LAVALINK_SERVER_PASSWORD=your_secure_password \
     lavalink-server
   ```

4. **Verify it's running:**
   ```bash
   curl http://localhost:2333/version
   ```

### Using Docker Compose

1. **Create `docker-compose.yml`:**
   ```yaml
   version: '3.8'
   services:
     lavalink:
       build: .
       ports:
         - "2333:2333"
       environment:
         - LAVALINK_SERVER_PASSWORD=your_secure_password
         - PORT=2333
       restart: unless-stopped
       volumes:
         - ./logs:/opt/Lavalink/logs
   ```

2. **Start the service:**
   ```bash
   docker-compose up -d
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `2333` | Server port |
| `LAVALINK_SERVER_PASSWORD` | **Yes** | - | Server password (must be set!) |
| `SPOTIFY_CLIENT_ID` | No | - | Spotify API client ID |
| `SPOTIFY_CLIENT_SECRET` | No | - | Spotify API client secret |
| `SPOTIFY_COUNTRY_CODE` | No | `US` | Spotify country code |
| `APPLE_MUSIC_API_TOKEN` | No | - | Apple Music API token |
| `APPLE_MUSIC_COUNTRY_CODE` | No | `US` | Apple Music country code |
| `DEEZER_MASTER_KEY` | No | - | Deezer master decryption key |
| `METRICS_ENABLED` | No | `false` | Enable Prometheus metrics |
| `SENTRY_DSN` | No | - | Sentry DSN for error tracking |
| `ENVIRONMENT` | No | `production` | Environment name |
| `YOUTUBE_PLAYLIST_LOAD_LIMIT` | No | `10` | Max tracks to load from playlists |
| `OPUS_ENCODING_QUALITY` | No | `10` | Opus encoding quality (0-10) |

### Getting API Credentials

**Spotify:**
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Copy Client ID and Client Secret

**Apple Music:**
1. Visit [Apple Music API](https://developer.apple.com/documentation/applemusicapi/getting_keys_and_creating_tokens)
2. Generate a developer token
3. Use it as `APPLE_MUSIC_API_TOKEN`

**Deezer:**
- Requires a master decryption key (advanced users only)

## 💻 Usage

### Connecting from Discord.js Bot (with Erela.js)

```javascript
const { Client } = require('discord.js');
const { Manager } = require('erela.js');

const client = new Client({
  intents: ['Guilds', 'GuildVoiceStates', 'GuildMessages']
});

client.manager = new Manager({
  nodes: [{
    host: 'your-service-name.onrender.com',
    port: 443,
    password: 'your_lavalink_password',
    secure: true
  }],
  send: (id, payload) => {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  }
});

client.manager.on('nodeConnect', node => {
  console.log(`Node "${node.options.identifier}" connected.`);
});

client.on('ready', () => {
  client.manager.init(client.user.id);
  console.log('Bot is ready!');
});

client.on('raw', d => client.manager.updateVoiceState(d));

client.login('your_discord_bot_token');
```

### Connecting from Discord.js Bot (with Shoukaku)

```javascript
const { Client } = require('discord.js');
const { Shoukaku, Connectors } = require('shoukaku');

const client = new Client({
  intents: ['Guilds', 'GuildVoiceStates']
});

const shoukaku = new Shoukaku(
  new Connectors.DiscordJS(client),
  [{
    name: 'Lavalink',
    url: 'your-service-name.onrender.com:443',
    auth: 'your_lavalink_password',
    secure: true
  }]
);

shoukaku.on('ready', (name) => {
  console.log(`Lavalink ${name} is ready!`);
});

client.login('your_discord_bot_token');
```

## 🌐 Available Endpoints

- `GET /` - **NEW!** Web dashboard (monitoring interface)
- `GET /version` - Get Lavalink version info (health check)
- `GET /info` - Get node information
- `GET /stats` - Get node statistics
- `GET /metrics` - Prometheus metrics (if enabled)
- `WS /v4/websocket` - WebSocket endpoint for bot connections
- `GET /v4/*` - All v4 API endpoints

## 🔒 Security

### Best Practices

1. **Strong Password**: Always use a strong, unique password
   ```bash
   # Generate a secure password
   openssl rand -base64 32
   ```

2. **Environment Variables**: Never commit `.env` files or hardcode secrets

3. **HTTPS**: Use HTTPS/WSS in production (Render provides this automatically)

4. **Firewall**: Restrict access to your Lavalink server if possible

5. **Updates**: Keep Lavalink and plugins updated regularly

### Security Checklist

- [ ] Changed default password
- [ ] Using environment variables for all secrets
- [ ] HTTPS/WSS enabled in production
- [ ] `.env` file is in `.gitignore`
- [ ] Regular security updates applied

## ⚡ Performance Tips for Render

### Free Plan Optimization

- The server is configured to use minimal memory (128-512MB)
- Reduce concurrent connections if experiencing issues
- Consider upgrading to a paid plan for better performance

### Paid Plan Recommendations

For production bots with high traffic:

1. **Starter Plan or Higher**: Better CPU and memory
2. **Enable Persistent Disk**: Store logs persistently
3. **Custom Domain**: Use your own domain
4. **Auto-scaling**: Configure based on traffic

### Memory Configuration

Adjust JVM memory in `Dockerfile` based on your plan:

```dockerfile
# For Render Free plan (default)
CMD ["java", "-Xmx512m", "-Xms128m", ...]

# For Render Starter plan
CMD ["java", "-Xmx1g", "-Xms256m", ...]

# For Render Pro plan
CMD ["java", "-Xmx2g", "-Xms512m", ...]
```

## 🐛 Troubleshooting

### Dashboard Not Loading

- Check that both Nginx and Lavalink are running: `docker logs <container-name>`
- Verify the port is correctly set: `echo $PORT`
- Check supervisor logs: `docker exec <container> cat /var/log/supervisor/supervisord.log`
- Ensure port 2333 (or your custom port) is accessible

### Dashboard Shows "Offline" Status

- Lavalink may still be starting (wait 30-60 seconds after container start)
- Check Lavalink logs: `docker exec <container> cat /var/log/supervisor/lavalink.out.log`
- Verify Lavalink is running on internal port 8080
- Check for errors in browser console (F12)

### API Endpoints Return 502 Bad Gateway

- Lavalink backend is not running or failed to start
- Check Lavalink logs for errors
- Verify application.yml configuration is correct
- Ensure LAVALINK_SERVER_PASSWORD is set

### Container Won't Start

- Check logs: `docker logs lavalink`
- Verify environment variables are set correctly
- Ensure port 2333 is not already in use
- Check that all required files are present in the build

### Connection Issues

- Verify password matches in bot and server
- Check firewall rules
- Ensure correct host/port in bot configuration
- For WebSocket: Make sure `/v4/websocket` path is used

### Plugin Errors

- Plugins require API credentials to work
- Check that environment variables are set
- Review logs for specific plugin errors

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Lavalink](https://github.com/lavalink-devs/Lavalink) - The amazing audio streaming node
- [LavaSrc](https://github.com/topi314/LavaSrc) - Multi-source plugin
- [LavaSearch](https://github.com/topi314/LavaSearch) - Enhanced search plugin
- [SponsorBlock](https://github.com/topi314/Sponsorblock-Plugin) - SponsorBlock integration

## 📞 Support

- [Lavalink Documentation](https://lavalink.dev/)
- [Render Documentation](https://render.com/docs)
- [Discord.js Guide](https://discordjs.guide/)

---

<div align="center">

**Made with ❤️ for the Discord bot community**

[⬆ Back to Top](#-lavalink-server)

</div>