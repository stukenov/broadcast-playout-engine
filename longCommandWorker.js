// longCommandWorker.js
const { sendCommandToCasparCG } = require('./casparcg');
const { sendCommandToFFMPEG } = require('./ffmpeg');
const { downloadFromRemoteServer } = require('./download');
const config = require('./config');
const logger = require('./logger'); // Импортируем logger

// Получаем аргументы: объект с target и командой, и ID команды
const [commandStr, commandId] = process.argv.slice(2);
const { commandTarget, commandString } = JSON.parse(commandStr);

async function executeLongCommand() {
  try {
    if (commandTarget === 'caspar') {
      const logMsg = `Sending CasparCG long command: ${commandString}`;
      logger.info(logMsg);
      process.send({ type: 'log', message: logMsg });
      await sendCommandToCasparCG(config.channels[0], commandString, (msg) => {
        process.send({ type: 'log', message: msg });
      });
      const successMsg = `CasparCG long command executed successfully. Command ID: ${commandId}`;
      logger.info(successMsg);
      process.send({ type: 'log', message: successMsg });
    } else if (commandTarget === 'ffmpeg') {
      const logMsg = `Sending FFMPEG long command: ${commandString}`;
      logger.info(logMsg);
      process.send({ type: 'log', message: logMsg });
      await sendCommandToFFMPEG(commandString, (msg) => {
        process.send({ type: 'log', message: msg });
      });
      const successMsg = `FFMPEG long command executed successfully. Command ID: ${commandId}`;
      logger.info(successMsg);
      process.send({ type: 'log', message: successMsg });
    } else if (commandTarget === 'download') {
      const logMsg = `Starting long download from: ${commandString}`;
      logger.info(logMsg);
      process.send({ type: 'log', message: logMsg });
      await downloadFromRemoteServer(commandString, (msg) => {
        process.send({ type: 'log', message: msg });
      });
      const successMsg = `Download long command executed successfully. Command ID: ${commandId}`;
      logger.info(successMsg);
      process.send({ type: 'log', message: successMsg });
    } else {
      const errorMsg = `Unknown command type: ${commandTarget}`;
      logger.warn(errorMsg);
      process.send({ type: 'log', message: errorMsg });
      process.send({ status: 'error', error: 'Unknown command type' });
      process.exit(1);
    }

    const finalMsg = 'Long command executed successfully.';
    logger.info(finalMsg);
    process.send({ type: 'log', message: finalMsg });
    process.send({ status: 'completed', response: true, logs: [finalMsg] });
    process.exit(0);
  } catch (error) {
    const errorLog = `Error executing long command ${commandId}: ${error.message}`;
    logger.error(errorLog);
    process.send({ type: 'log', message: errorLog });
    process.send({ status: 'error', response: false, logs: [error.message] });
    process.exit(1);
  }
}

executeLongCommand();
