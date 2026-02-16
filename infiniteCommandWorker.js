// infiniteCommandWorker.js
const { sendCommandToCasparCG } = require('./casparcg');
const { sendCommandToFFMPEG } = require('./ffmpeg');
const { downloadFromRemoteServer } = require('./download');
const config = require('./config');
const logger = require('./logger');
const { setInterval } = require('timers');

// Получаем аргументы: объект с target и командой, и ID команды
const [commandStr, commandId] = process.argv.slice(2);
const { commandTarget, commandString } = JSON.parse(commandStr);

async function executeInfiniteCommand() {
  // Установим интервал для отправки логов каждые 5 секунд
  const logInterval = setInterval(() => {
    const logMsg = 'Infinite command is still running.';
    logger.info(logMsg);
    process.send({ type: 'log', message: logMsg });
  }, 5000);

  try {
    if (commandTarget === 'caspar') {
      const logMsg = `Sending CasparCG infinite command: ${commandString}`;
      logger.info(logMsg);
      process.send({ type: 'log', message: logMsg });
      await sendCommandToCasparCG(config.channels[0], commandString, (msg) => {
        process.send({ type: 'log', message: msg });
      });
      const successMsg = `CasparCG infinite command executed successfully. Command ID: ${commandId}`;
      logger.info(successMsg);
      process.send({ type: 'log', message: successMsg });
    } else if (commandTarget === 'ffmpeg') {
      const logMsg = `Sending FFMPEG infinite command: ${commandString}`;
      logger.info(logMsg);
      process.send({ type: 'log', message: logMsg });
      await sendCommandToFFMPEG(commandString, (msg) => {
        process.send({ type: 'log', message: msg });
      });
      const successMsg = `FFMPEG infinite command executed successfully. Command ID: ${commandId}`;
      logger.info(successMsg);
      process.send({ type: 'log', message: successMsg });
    } else if (commandTarget === 'download') {
      const logMsg = `Starting infinite download from: ${commandString}`;
      logger.info(logMsg);
      process.send({ type: 'log', message: logMsg });
      await downloadFromRemoteServer(commandString, (msg) => {
        process.send({ type: 'log', message: msg });
      });
      const successMsg = `Download infinite command executed successfully. Command ID: ${commandId}`;
      logger.info(successMsg);
      process.send({ type: 'log', message: successMsg });
    } else {
      const errorMsg = `Unknown command type: ${commandTarget}`;
      logger.warn(errorMsg);
      process.send({ type: 'log', message: errorMsg });
      process.send({ status: 'error', response: false, logs: [errorMsg] });
      clearInterval(logInterval);
      process.exit(1);
    }

    const finalMsg = 'Infinite command is running.';
    logger.info(finalMsg);
    process.send({ type: 'log', message: finalMsg });
    // Infinite команды обычно не завершаются, поэтому не отправляем статус завершения
  } catch (error) {
    const errorLog = `Error executing infinite command ${commandId}: ${error.message}`;
    logger.error(errorLog);
    process.send({ type: 'log', message: errorLog });
    process.send({ status: 'error', response: false, logs: [error.message] });
    clearInterval(logInterval);
    process.exit(1);
  }
}

executeInfiniteCommand();
