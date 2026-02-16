const net = require('net');
const logger = require('./logger'); // Импортируем logger

/**
 * Отправляет команду CasparCG и обрабатывает её вывод.
 * @param {Object} channelConfig - Конфигурация канала CasparCG
 * @param {string} command - Команда для отправки
 * @param {function} logCallback - Функция для отправки логов
 * @returns {Promise<void>}
 */
function sendCommandToCasparCG(channelConfig, command, logCallback) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    const host = channelConfig.casparcg.host;
    const port = channelConfig.casparcg.port;

    let commandText = command.trim();

    client.connect(port, host, () => {
      const fullCommand = `${commandText}\r\n`;
      const sendMsg = `[${channelConfig.name}] SENDING: ${fullCommand.trim()}`;
      logger.info(sendMsg);
      if (typeof logCallback === 'function') logCallback(sendMsg);
      client.write(fullCommand);
    });

    client.on('data', (data) => {
      const response = data.toString().trim();
      const receivedMsg = `[${channelConfig.name}] RECEIVED: ${response}`;
      logger.info(receivedMsg);
      if (typeof logCallback === 'function') logCallback(receivedMsg);
      resolve();
      client.end();
    });

    client.on('error', (err) => {
      const errorMsg = `[${channelConfig.name}] ERROR: ${err.message}`;
      logger.error(errorMsg);
      if (typeof logCallback === 'function') logCallback(errorMsg);
      reject(new Error(err.message));
    });

    client.on('close', () => {
      const closeMsg = `[${channelConfig.name}] CONNECTION CLOSED`;
      logger.info(closeMsg);
      if (typeof logCallback === 'function') logCallback(closeMsg);
    });
  });
}

module.exports = {
  sendCommandToCasparCG,
};
