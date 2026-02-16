const https = require('https'); // Добавляем модуль https
const config = require('./config');
const { sendCommandToCasparCG } = require('./casparcg');
const { sendCommandToFFMPEG } = require('./ffmpeg');
const { getInitData, registerWithCaller } = require('./register');
const { downloadFromRemoteServer } = require('./download');
const { fork } = require('child_process');
const path = require('path');
const pm2 = require('pm2');
const logger = require('./logger'); // Импортируем logger

// Общие переменные для хранения логов каждой команды
const commandLogs = {};

// Функция для отправки статуса команды с дополнительными полями
function sendCommandCompletion(commandId, status, response, logs = []) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ status, response, logs });

    const options = {
      hostname: process.env.CONSOLE_HOST || 'localhost',
      port: parseInt(process.env.CONSOLE_PORT, 10) || 6000,
      path: `/adapto/servers/${encodeURIComponent(process.env.SERVER_NAME)}/commands/${encodeURIComponent(commandId)}/status`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${process.env.LICENSE_KEY || 'your_secure_token'}`,
      },
      rejectUnauthorized: false, // Отключаем проверку сертификата
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        logger.info(`Successfully notified ${status} status of command ${commandId}.`);
        resolve();
      } else {
        logger.error(`Failed to notify ${status} status of command ${commandId}. Status code: ${res.statusCode}`);
        reject(new Error(`Status notification failed with status code ${res.statusCode}`));
      }
    });

    req.on('error', (e) => {
      logger.error(`Problem with ${status} status notification request: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Функция для обработки коротких команд
async function handleShortCommand(command) {
  const commandId = command.command.id;
  const commandTarget = command.command.target;
  const commandString = command.command.command; // Получаем строку команды

  logger.info(`Handling short command: ${commandId}`);

  const logs = []; // Инициализируем массив логов

  // Определяем функцию логирования
  const logCallback = (msg) => {
    logger.info(msg);
    logs.push(msg);
  };

  try {
    if (commandTarget === 'caspar') {
      logCallback(`Sending CasparCG command: ${commandString}`);
      await sendCommandToCasparCG(config.channels[0], commandString, logCallback);
      logCallback(`CasparCG command executed successfully. Command ID: ${commandId}`);
    } else if (commandTarget === 'ffmpeg') {
      logCallback(`Sending FFMPEG command: ${commandString}`);
      await sendCommandToFFMPEG(commandString, logCallback);
      logCallback(`FFMPEG command executed successfully. Command ID: ${commandId}`);
    } else if (commandTarget === 'download') {
      logCallback(`Starting download from: ${commandString}`);
      await downloadFromRemoteServer(commandString, logCallback);
      logCallback(`Download command executed successfully. Command ID: ${commandId}`);
    } else {
      const errorMsg = `Unknown command type: ${commandTarget}`;
      logger.warn(errorMsg);
      logs.push(errorMsg);
      await sendCommandCompletion(commandId, 'completed', false, logs);
      return;
    }

    logCallback('Short command executed successfully.');
    await sendCommandCompletion(commandId, 'completed', true, logs);
  } catch (error) {
    const errorLog = `Error executing short command ${commandId}: ${error.message}`;
    logger.error(errorLog);
    logs.push(`Error: ${error.message}`);
    await sendCommandCompletion(commandId, 'completed', false, logs);
  }
}

// Функция для обработки длинных команд
function handleLongCommand(command) {
  const commandId = command.command.id;
  const commandTarget = command.command.target;
  const commandString = command.command.command; // Получаем строку команды

  logger.info(`Handling long command: ${commandId}`);

  // Отправляем статус 'working' при начале выполнения команды
  sendCommandCompletion(commandId, 'working', true, ['Long command is in progress.']);

  const workerPath = path.join(__dirname, 'longCommandWorker.js');

  const worker = fork(workerPath, [JSON.stringify({ commandTarget, commandString }), commandId]);

  // Обработка сообщений от воркера
  worker.on('message', async (message) => {
    if (message.type === 'log') {
      // Инициализируем массив логов, если еще не инициализирован
      if (!commandLogs[commandId]) {
        commandLogs[commandId] = [];
      }
      // Добавляем новый лог
      commandLogs[commandId].push(message.message);
      // Отправляем обновленные логи
      await sendCommandCompletion(commandId, 'working', true, commandLogs[commandId]);
    } else if (message.status === 'completed') {
      logger.info(`Long command ${commandId} completed.`);
      // Добавляем последние логи
      if (!commandLogs[commandId]) {
        commandLogs[commandId] = [];
      }
      commandLogs[commandId].push('Long command executed successfully.');
      await sendCommandCompletion(commandId, 'completed', true, commandLogs[commandId]);
      worker.kill();
    } else if (message.status === 'error') {
      logger.error(`Long command ${commandId} encountered an error: ${message.error}`);
      if (!commandLogs[commandId]) {
        commandLogs[commandId] = [];
      }
      commandLogs[commandId].push(`Error: ${message.error}`);
      await sendCommandCompletion(commandId, 'completed', false, commandLogs[commandId]);
      worker.kill();
    }
  });

  worker.on('error', (error) => {
    logger.error(`Worker process for command ${commandId} encountered an error:`, error);
    // Можно отправить статус ошибки
    sendCommandCompletion(commandId, 'completed', false, [`Worker error: ${error.message}`]);
  });

  worker.on('exit', (code, signal) => {
    if (code !== 0) {
      logger.error(`Worker process for command ${commandId} exited with code ${code} and signal ${signal}`);
      // Можно отправить статус ошибки
      sendCommandCompletion(commandId, 'completed', false, [`Worker exited with code ${code} and signal ${signal}`]);
    }
  });
}

// Функция для обработки бесконечных команд
function handleInfiniteCommand(command) {
  const commandId = command.command.id;
  const commandTarget = command.command.target;
  const commandString = command.command.command; // Получаем строку команды

  logger.info(`Handling infinite command: ${commandId}`);

  // Отправляем статус 'working' при начале выполнения команды
  sendCommandCompletion(commandId, 'working', true, ['Infinite command is running.']);

  const workerPath = path.join(__dirname, 'infiniteCommandWorker.js');

  const commandData = JSON.stringify({ commandTarget, commandString });

  // Подключаемся к PM2
  pm2.connect(function(err) {
    if (err) {
      logger.error('Error connecting to PM2:', err);
      sendCommandCompletion(commandId, 'completed', false, [`PM2 connection error: ${err.message}`]);
      return;
    }

    // Формируем уникальное имя процесса
    const processName = `infinite-command-${commandId}`;

    // Проверяем, запущен ли уже такой процесс
    pm2.list((err, list) => {
      if (err) {
        logger.error('Error listing PM2 processes:', err);
        pm2.disconnect();
        sendCommandCompletion(commandId, 'completed', false, [`PM2 list error: ${err.message}`]);
        return;
      }

      const existingProcess = list.find(proc => proc.name === processName);

      if (existingProcess) {
        logger.info(`Infinite command ${commandId} is already running.`);
        pm2.disconnect();
        sendCommandCompletion(commandId, 'completed', false, ['Infinite command is already running.']);
        return;
      }

      // Запускаем новый процесс
      pm2.start({
        script: workerPath,
        name: processName,
        args: [commandData, commandId],
        exec_mode: 'fork',
        autorestart: true,
        max_restarts: Infinity,
        watch: false,
      }, async (err, apps) => {
        if (err) {
          logger.error(`Error starting PM2 process for command ${commandId}:`, err);
          await sendCommandCompletion(commandId, 'completed', false, [`PM2 start error: ${err.message}`]);
        } else {
          logger.info(`Infinite command ${commandId} started with PM2 as process ${processName}.`);
          await sendCommandCompletion(commandId, 'working', true, ['Infinite command started successfully.']);
        }
        pm2.disconnect();
      });
    });
  });
}

// Общая функция для обработки команд
async function handleCommand(command) {
  if (command.message === "NOCOMMAND") {
    console.log("No command received. Skipping.");
    await wait(1000);
    return;
  }

  const commandId = command.command.id;
  const commandTarget = command.command.target;
  const commandLength = command.command.length; // "short", "long", "infinite"

  console.log(command);

  if (!commandId) {
    console.error('Command does not have an id. Skipping.');
    return;
  }

  switch (commandLength) {
    case 'short':
      await handleShortCommand(command);
      break;
    case 'long':
      handleLongCommand(command);
      break;
    case 'infinite':
      handleInfiniteCommand(command);
      break;
    default:
      console.error(`Unknown command length: ${commandLength}. Skipping.`);
      return;
  }

  await wait(6000);
}

// Функция ожидания
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Функция для получения команды
function fetchCommand() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: process.env.CONSOLE_HOST || 'localhost',
      port: parseInt(process.env.CONSOLE_PORT, 10) || 6000,
      path: `/adapto/servers/${encodeURIComponent(process.env.SERVER_NAME)}/commands`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.LICENSE_KEY || 'your_secure_token'}`,
      },
      rejectUnauthorized: false, // Отключаем проверку сертификата
      agent: new https.Agent({
        rejectUnauthorized: false, // Отключаем проверку сертификата
      }),
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const command = JSON.parse(data);
            resolve(command);
          } catch (e) {
            console.error('Error parsing command:', e);
            reject(e);
          }
        } else if (res.statusCode === 302) {
          const location = res.headers.location;
          if (location) {
            const redirectOptions = new URL(location);
            redirectOptions.method = 'GET';
            redirectOptions.headers = options.headers;
            redirectOptions.agent = new https.Agent({
              rejectUnauthorized: false, // Отключаем проверку сертификата
            });
            const redirectReq = https.request(redirectOptions, (redirectRes) => {
              let redirectData = '';
              redirectRes.on('data', (chunk) => {
                redirectData += chunk;
              });
              redirectRes.on('end', () => {
                if (redirectRes.statusCode === 200) {
                  try {
                    const command = JSON.parse(redirectData);
                    resolve(command);
                  } catch (e) {
                    console.error('Error parsing redirected command:', e);
                    reject(e);
                  }
                } else {
                  console.error(`Unexpected status code after redirect: ${redirectRes.statusCode}`);
                  reject(new Error(`Unexpected status code after redirect: ${redirectRes.statusCode}`));
                }
              });
            });
            redirectReq.on('error', (e) => {
              console.error(`Problem with redirect request: ${e.message}`);
              reject(e);
            });
            redirectReq.end();
          } else {
            console.error('Redirect location header is missing');
            reject(new Error('Redirect location header is missing'));
          }
        } else if (res.statusCode === 404) {
          resolve(null);
        } else {
          console.error(`Unexpected status code: ${res.statusCode}`);
          reject(new Error(`Unexpected status code: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with GET request: ${e.message}`);
      reject(e);
    });

    req.end();
  });
}

// Основной цикл
async function mainLoop() {
  while (true) {
    try {
      await wait(1000);
      const command = await fetchCommand();

      if (command) {
        handleCommand(command); // Не ждем завершения обработки
      } else {
        const initData = await getInitData();
        try {
          await registerWithCaller(initData);
        } catch (error) {
          console.error('Failed to register with caller. Status code:', error.statusCode);
          throw new Error(`Registration failed with status code ${error.statusCode}`);
        }
        await wait(6000);
      }
    } catch (error) {
      console.error('Error in main loop:', error);
      await wait(6000);
    }
  }
}

mainLoop().catch(error => {
  console.error('Fatal error in main loop:', error);
  process.exit(1);
});
