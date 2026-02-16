const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');


function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -i "${filePath}"`, (error, stdout, stderr) => {
      const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1], 10);
        const minutes = parseInt(durationMatch[2], 10);
        const seconds = parseFloat(durationMatch[3]);
        const totalMilliseconds = ((hours * 60 + minutes) * 60 + seconds) * 1000;
        resolve(Math.floor(totalMilliseconds));
      } else {
        reject(`FAILED DURATION OF FILE ${filePath}. ERROR: ${error ? error.message : 'UNKNOWN ERROR'}`);
      }
    });
  });
}


function formatISO(date) {
  return date.toISOString();
}


function getVideoFiles(dir) {
  const supportedExtensions = ['.mp4', '.mov', '.avi', '.mkv'];
  return fs.readdirSync(dir).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return supportedExtensions.includes(ext);
  });
}


async function generatePlaylist(videosDir, startDateTime) {
  const files = getVideoFiles(videosDir);
  if (files.length === 0) {
    throw new Error('NO VIDEOS FOUND IN FOLDER');
  }

  const videos = [];
  for (const file of files) {
    const filePath = path.join(videosDir, file);
    try {
      const duration = await getVideoDuration(filePath);
      videos.push({ clip: file, duration });
    } catch (error) {
      console.error(error);
    }
  }

  if (videos.length === 0) {
    throw new Error('FAILED TO GET DURATION');
  }

  const dayStart = new Date(startDateTime);
  let currentTime = dayStart.getTime();
  const dayEnd = dayStart.getTime() + 24 * 60 * 60 * 1000; 

  const playlist = [];

  while (currentTime < dayEnd) {
    const randomIndex = Math.floor(Math.random() * videos.length);
    const video = videos[randomIndex];
    const duration = video.duration;

    const remainingTime = dayEnd - currentTime;
    const actualDuration = duration > remainingTime ? remainingTime : duration;

    const startAt = new Date(currentTime);
    const endAt = new Date(currentTime + actualDuration);

    playlist.push({
      startAt: formatISO(startAt),
      duration: actualDuration,
      endAt: formatISO(endAt),
      clip: video.clip
    });

    currentTime += actualDuration;
  }

  return playlist;
}

function savePlaylist(playlist, startDateTime) {
  const dateStr = startDateTime.toISOString().split('T')[0];
  const fileName = `${dateStr}.json`;
  fs.writeFileSync(fileName, JSON.stringify(playlist, null, 2), 'utf-8');
  console.log(`PLAYLIST SAVED TO ${fileName}`);
}

async function main() {
  try {
    const videosDir = 'C:\\Users\\sakentukenov\\Desktop\\casparcg-server\\media';
    const startDateTime = new Date('2024-10-26T00:00:00.000Z');

    const playlist = await generatePlaylist(videosDir, startDateTime);
    savePlaylist(playlist, startDateTime);
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

main();
