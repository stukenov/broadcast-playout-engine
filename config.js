const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('.env FILE NOT FOUND. USING DEFAULT VALUES');
    return;
  }

  const envData = fs.readFileSync(envPath, 'utf8');
  const lines = envData.split('\n');

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
      return;
    }

    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      return;
    }

    const key = trimmedLine.substring(0, equalIndex).trim();
    const value = trimmedLine.substring(equalIndex + 1).trim();

    const cleanedValue = value.replace(/^["']|["']$/g, '');

    process.env[key] = cleanedValue;
  });
}

loadEnv();

const defaultCasparcgConfig = {
  host: process.env.CASPARCG_HOST || 'localhost',
  port: parseInt(process.env.CASPARCG_PORT, 10) || 5250,
};

const defaultScheduleFilePath = path.join(process.cwd(), 'playlists', 'schedule_default.json');

const channels = [
  {
    name: 'default',
    number: 1,
    casparcg: {
      host: process.env.CASPARCG_HOST || 'localhost',
      port: parseInt(process.env.CASPARCG_PORT, 10) || 5250,
    },
    schedule: {
      filePath: path.join(process.cwd(), 'playlists', 'schedule_default.json'),
    },
  },
  {
    name: 'secondary',
    number: 2,
    casparcg: {
      host: process.env.SECONDARY_CASPARCG_HOST || 'localhost',
      port: parseInt(process.env.SECONDARY_CASPARCG_PORT, 10) || 5250,
    },
    schedule: {
      filePath: path.join(process.cwd(), 'playlists', 'schedule_secondary.json'),
    },
  },
];

const modes = {
  mode: 'caller', // Always 'caller'
  caller: {
    enabled: process.env.CALLER === 'on',
    listenerAddress: process.env.CALLER_LISTENER_ADDRESS || 'localhost',
    listenerPort: parseInt(process.env.CALLER_LISTENER_PORT, 10) || 6000,
    authToken: process.env.CALLER_AUTH_TOKEN || 'securetoken',
  },
};

module.exports = {
  channels,
  modes,
};
