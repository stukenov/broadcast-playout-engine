const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

const ffmpegPath = 'ffmpeg';

if (!ffmpegPath) {
  console.error('FFMPEG NOT FOUND');
  process.exit(1);
}

const config = {
  ffmpegPath: ffmpegPath,
  ffmpegArgs: [
    '-i', 'rtmp://192.168.1.75/live/s1',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-ac', '2',
    '-af', 'aresample=matrix_encoding=dplii',
    '-f', 'flv',
    'rtmp://a.live.qazcdn.net:1936/static/qazplay'
  ],
  checkInterval: 5000,
  maxNoProgress: 10000,
  logFile: path.join(__dirname, 'transcoder.log'),
};

let ffmpegProcess = null;
let lastProgressTime = Date.now();

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function startFFmpeg() {
  log('STARTING FFMPEG...');
  ffmpegProcess = spawn(config.ffmpegPath, config.ffmpegArgs);

  ffmpegProcess.stdout.on('data', (data) => {
    log(`FFMPEG STDOUT: ${data.toString()}`);
  });

  const rl = readline.createInterface({
    input: ffmpegProcess.stderr,
    crlfDelay: Infinity,
  });

  rl.on('line', (line) => {
    log(`FFMPEG STDERR: ${line}`);

    if (line.startsWith('frame=')) {
      lastProgressTime = Date.now();

      const speedMatch = line.match(/speed=(\d+(\.\d+)?)x/);
      if (speedMatch) {
        const speed = parseFloat(speedMatch[1]);
        if (speed < 0.5) { 
          log(`FFMPEG SPEED LOW: ${speed}x. RESTARTING...`);
          restartFFmpeg();
        }
      }
    }

    if (line.toLowerCase().includes('error')) {
      log('FFMPEG ERROR DETECTED. RESTARTING...');
      restartFFmpeg();
    }
  });

  ffmpegProcess.on('close', (code, signal) => {
    log(`FFMPEG CLOSED WITH CODE ${code} AND SIGNAL ${signal}`);
    ffmpegProcess = null;
    setTimeout(startFFmpeg, 3000);
  });

  ffmpegProcess.on('error', (err) => {
    log(`FFMPEG ERROR: ${err}`);
    restartFFmpeg();
  });
}

function restartFFmpeg() {
  if (ffmpegProcess) {
    log('RESTARTING FFMPEG...');
    ffmpegProcess.kill('SIGKILL');
  }
}

function monitorFFmpeg() {
  if (ffmpegProcess) {
    const now = Date.now();
    if (now - lastProgressTime > config.maxNoProgress) {
      log('FFMPEG NOT SHOWING PROGRESS. RESTARTING...');
      restartFFmpeg();
    }
  }
}

startFFmpeg();

setInterval(monitorFFmpeg, config.checkInterval);

process.on('SIGINT', () => {
  log('RECEIVED SIGINT. SHUTTING DOWN...');
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGTERM');
  }
  process.exit();
});

process.on('SIGTERM', () => {
  log('RECEIVED SIGTERM. SHUTTING DOWN...');
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGTERM');
  }
  process.exit();
});
