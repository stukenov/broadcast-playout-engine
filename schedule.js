const fs = require('fs');
const { sendPlayCommand, pingCasparCG } = require('./casparcg');
const { parseISODate, loadSchedule } = require('./utils');
const { channels, modes } = require('./config');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runChannel(channelConfig) {
  let scheduleItems = [];
  let lastScheduleLoadTime = 0;

  while (true) {
    const now = new Date();

    const scheduleFilePath =
      channelConfig.schedule.filePath;
    let scheduleStat;
    try {
      scheduleStat = fs.statSync(scheduleFilePath);
      if (scheduleStat.mtimeMs > lastScheduleLoadTime) {
        scheduleItems = loadSchedule(scheduleFilePath);
        lastScheduleLoadTime = scheduleStat.mtimeMs;
        console.log(`[${channelConfig.name}] SCHEDULE RELOADED`);
      }
    } catch (err) {
      console.warn(
        `[${channelConfig.name}] SCHEDULE NOT FOUND OR ERROR: ${err.message}`
      );
      scheduleItems = [];
    }

    const isCasparAvailable = await pingCasparCG(channelConfig);

    const nextItem = scheduleItems.find((item) => {
      const startAt = parseISODate(item.startAt);
      const endAt = parseISODate(item.endAt);
      return startAt <= now && endAt >= now && !item.played;
    });

    if (nextItem) {
      if (isCasparAvailable) {
        try {
          await sendPlayCommand(channelConfig, nextItem.layer || 1, nextItem.clip);
          nextItem.played = true;
          console.log(`[${channelConfig.name}] PLAYING CLIP: ${nextItem.clip}`);
        } catch (err) {
          console.error(
            `[${channelConfig.name}] ERROR PLAYING CLIP: ${nextItem.clip} - ${err.message}`
          );
        }
      } else {
        console.log(
          `[${channelConfig.name}] CASPARCG NOT AVAILABLE, CANNOT PLAY: ${nextItem.clip}`
        );
      }
    } else {
      if (scheduleItems.length === 0) {
        console.log(`[${channelConfig.name}] NO SCHEDULE ITEMS FOUND`);
        if (isCasparAvailable) {
          try {
            await sendPlayCommand(channelConfig, 1, 'colorbars.mp4');
          } catch (err) {
            console.error(
              `[${channelConfig.name}] ERROR PLAYING DEFAULT : ${err.message}`
            );
          }
        } else {
          console.log(
            `[${channelConfig.name}] CASPARCG NOT AVAILABLE, CANNOT PLAY DEFAULT`
          );
        }
      } else {
        const futureItems = scheduleItems.filter(
          (item) => parseISODate(item.startAt) > now && !item.played
        );
        if (futureItems.length > 0) {
          const nextStartTime = parseISODate(futureItems[0].startAt);
          const delay = nextStartTime - now;
          console.log(
            `[${channelConfig.name}] WAITING FOR NEXT ITEM IN ${Math.ceil(
              delay / 1000
            )} SECONDS`
          );
          await sleep(Math.min(delay, 5000));
        } else {
          console.log(`[${channelConfig.name}] NO ITEMS TO PLAY AT THIS`);
          await sleep(5000);
        }
      }
    }

    await sleep(1000);
  }
}

async function runScheduler() {
  const channelPromises = channels.map((channelConfig) => {
    return runChannel(channelConfig);
  });

  await Promise.all(channelPromises);
}

async function main() {

  runScheduler()

}

main().catch((err) => console.error('UNHANDLED ERROR IN MAIN:', err));
