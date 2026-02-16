# Broadcast Playout Engine

A professional Node.js-based broadcast playout automation engine with CasparCG integration, FFmpeg transcoding, and advanced scheduling capabilities. This system provides a robust command-driven architecture for managing broadcast workflows, media playback, and real-time video processing.

## Features

- **CasparCG Integration**: Direct communication with CasparCG Server for professional broadcast playout
- **FFmpeg Support**: Built-in FFmpeg command execution for media transcoding and processing
- **Remote Media Management**: Automated media download and synchronization from remote servers
- **Command Queue System**: Sophisticated command processing with support for short, long, and infinite-running commands
- **Process Management**: PM2 integration for reliable long-running process management
- **Multi-Channel Support**: Configure and manage multiple broadcast channels simultaneously
- **Real-time Logging**: Comprehensive logging system with Winston for monitoring and debugging
- **Worker Architecture**: Fork-based worker processes for handling resource-intensive operations
- **Remote Control**: REST API integration for remote command execution and status monitoring
- **Schedule Management**: JSON-based playlist scheduling system for automated broadcast workflows

## Architecture

The engine implements a command-caller pattern where:

1. **Main Process** (`index.js`): Polls for commands from a remote console server and dispatches them to appropriate handlers
2. **Command Handlers**: Three types of command execution patterns:
   - **Short Commands**: Quick operations that complete in seconds (e.g., play/stop)
   - **Long Commands**: Extended operations running in forked child processes (e.g., transcoding)
   - **Infinite Commands**: Persistent services managed by PM2 (e.g., streaming)

3. **Service Modules**:
   - `casparcg.js`: CasparCG Server communication layer
   - `ffmpeg.js`: FFmpeg process spawning and management
   - `download.js`: Remote media file downloads
   - `register.js`: Server registration and initialization
   - `logger.js`: Centralized logging service

## Installation

### Prerequisites

- Node.js 14.x or higher
- CasparCG Server (for playout functionality)
- FFmpeg (for transcoding capabilities)
- PM2 (for process management)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/stukenov/broadcast-playout-engine.git
cd broadcast-playout-engine
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
CONSOLE_HOST=localhost
CONSOLE_PORT=3000
SERVER_NAME=YOUR_SERVER_NAME
LICENSE_KEY=your_license_key_here
DOWNLOAD_PATH=download
```

4. Create required directories:
```bash
mkdir -p download playlists logs
```

5. Configure CasparCG connection in `config.js` (optional):
```javascript
// Default configuration uses localhost:5250
// Modify for your CasparCG Server setup
```

## Usage

### Starting the Engine

```bash
node index.js
```

The engine will:
1. Connect to the remote console server
2. Register itself with the configured server name
3. Begin polling for commands
4. Execute commands and report status back to the console

### Command Types

#### Short Commands
Immediate execution commands that complete quickly:
```javascript
{
  "command": {
    "id": "cmd-001",
    "target": "caspar",
    "command": "PLAY 1-1 AMB",
    "length": "short"
  }
}
```

#### Long Commands
Extended operations that run in separate processes:
```javascript
{
  "command": {
    "id": "cmd-002",
    "target": "ffmpeg",
    "command": "ffmpeg -i input.mp4 -c:v libx264 output.mp4",
    "length": "long"
  }
}
```

#### Infinite Commands
Persistent services managed by PM2:
```javascript
{
  "command": {
    "id": "cmd-003",
    "target": "ffmpeg",
    "command": "ffmpeg -re -i stream.mp4 -f mpegts udp://localhost:1234",
    "length": "infinite"
  }
}
```

### Supported Command Targets

- **`caspar`**: Send AMCP commands to CasparCG Server
- **`ffmpeg`**: Execute FFmpeg commands for transcoding/streaming
- **`download`**: Download media files from remote URLs

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONSOLE_HOST` | Remote console server hostname | `localhost` |
| `CONSOLE_PORT` | Remote console server port | `3000` |
| `SERVER_NAME` | Unique identifier for this playout server | Required |
| `LICENSE_KEY` | Authentication token for console server | Required |
| `DOWNLOAD_PATH` | Directory for downloaded media files | `download` |
| `CASPARCG_HOST` | CasparCG Server hostname | `localhost` |
| `CASPARCG_PORT` | CasparCG Server AMCP port | `5250` |

### Channel Configuration

Configure multiple channels in `config.js`:

```javascript
const channels = [
  {
    name: 'default',
    number: 1,
    casparcg: {
      host: 'localhost',
      port: 5250,
    },
    schedule: {
      filePath: './playlists/schedule_default.json',
    },
  },
  // Add more channels as needed
];
```

## Project Structure

```
broadcast-playout-engine/
├── index.js                    # Main application entry point
├── casparcg.js                 # CasparCG communication module
├── ffmpeg.js                   # FFmpeg process management
├── download.js                 # Remote media download handler
├── config.js                   # Configuration loader and parser
├── register.js                 # Server registration logic
├── logger.js                   # Winston-based logging system
├── longCommandWorker.js        # Worker for long-running commands
├── infiniteCommandWorker.js    # Worker for infinite commands
├── schedule.js                 # Scheduling and playlist management
├── transcode.js                # Media transcoding utilities
├── generate.js                 # Playlist generation tools
├── utils.js                    # Common utility functions
├── nms.js                      # Node Media Server integration
├── package.json                # Project dependencies
├── .env.example                # Example environment configuration
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## API Integration

The engine communicates with a remote console server via HTTPS:

### Command Polling
```
GET /adapto/servers/{SERVER_NAME}/commands
Authorization: Bearer {LICENSE_KEY}
```

### Status Reporting
```
POST /adapto/servers/{SERVER_NAME}/commands/{COMMAND_ID}/status
Authorization: Bearer {LICENSE_KEY}
Content-Type: application/json

{
  "status": "completed|working",
  "response": true|false,
  "logs": ["log message 1", "log message 2"]
}
```

## CasparCG Commands

Example AMCP commands supported:

```bash
# Play media
PLAY 1-1 myVideo

# Load media to background
LOADBG 1-1 nextVideo

# Stop playback
STOP 1-1

# Clear channel
CLEAR 1-1

# Get channel info
INFO 1-1
```

## FFmpeg Examples

### Transcoding
```bash
ffmpeg -i input.mov -c:v libx264 -preset fast -crf 23 -c:a aac output.mp4
```

### Streaming
```bash
ffmpeg -re -i video.mp4 -c copy -f mpegts udp://239.1.1.1:1234
```

### Thumbnails
```bash
ffmpeg -i video.mp4 -vf fps=1/10 -s 320x180 thumb_%03d.jpg
```

## Logging

Logs are managed by Winston and stored in the `logs/` directory:

- **app.log**: Combined log file with all messages
- Console output: Real-time log streaming

Log levels: `error`, `warn`, `info`, `verbose`, `debug`

## Process Management

Long-running and infinite commands are managed by PM2:

```bash
# List running processes
pm2 list

# Monitor processes
pm2 monit

# Stop a specific command
pm2 stop infinite-command-{COMMAND_ID}

# Delete a process
pm2 delete infinite-command-{COMMAND_ID}
```

## Development

### Running in Development Mode

```bash
# With PM2
pm2 start index.js --name broadcast-engine --watch

# Direct execution
node index.js
```

### Testing Commands

You can test individual modules:

```javascript
// Test CasparCG connection
const { sendCommandToCasparCG } = require('./casparcg');
const config = require('./config');

sendCommandToCasparCG(config.channels[0], 'INFO', console.log)
  .then(() => console.log('Success'))
  .catch(err => console.error(err));
```

## Troubleshooting

### Common Issues

1. **CasparCG Connection Failed**
   - Verify CasparCG Server is running
   - Check `CASPARCG_HOST` and `CASPARCG_PORT` settings
   - Ensure firewall allows port 5250 (default AMCP port)

2. **Command Not Executing**
   - Check console server connectivity
   - Verify `LICENSE_KEY` is correct
   - Review logs in `logs/app.log`

3. **FFmpeg Command Fails**
   - Ensure FFmpeg is installed and in system PATH
   - Check input file paths are absolute
   - Review FFmpeg logs in command output

4. **Download Issues**
   - Verify network connectivity to remote server
   - Check `DOWNLOAD_PATH` directory exists and is writable
   - Ensure SSL certificates are valid (or disable certificate validation)

## Security Considerations

- **Never commit `.env` files**: Contains sensitive credentials
- **Use HTTPS**: For production console server communication
- **Secure License Keys**: Store securely and rotate regularly
- **Network Security**: Restrict access to CasparCG and FFmpeg ports
- **Input Validation**: Validate all remote commands before execution

## Performance Optimization

- Use worker processes for CPU-intensive operations
- Configure PM2 with appropriate restart policies
- Monitor system resources with PM2 monitoring tools
- Optimize FFmpeg presets based on hardware capabilities
- Use CasparCG Server's built-in caching for frequently used media

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [CasparCG Server](https://github.com/CasparCG/server) - Professional broadcast playout software
- [FFmpeg](https://ffmpeg.org/) - Complete multimedia framework
- [Winston](https://github.com/winstonjs/winston) - Universal logging library
- [PM2](https://pm2.keymetrics.io/) - Production process manager

## Support

For issues, questions, or contributions, please open an issue on GitHub:
https://github.com/stukenov/broadcast-playout-engine/issues

---

**Note**: This is a command-driven playout engine designed to work with a remote console server. Ensure your console server is properly configured and accessible before running this engine.
