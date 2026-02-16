const { spawn } = require('child_process');
const logger = require('./logger'); // Импортируем logger

/**
 * Запускает команду FFmpeg и обрабатывает её вывод.
 * @param {string} command - Полная команда FFmpeg, например: "ffmpeg -version"
 * @param {function} logCallback - Функция для отправки логов
 * @returns {Promise<void>}
 */
function sendCommandToFFMPEG(command, logCallback) {
    return new Promise((resolve, reject) => {
        if (typeof command !== 'string' || command.trim() === '') {
            const errorMsg = 'Invalid command provided to FFMPEG.';
            logger.error(errorMsg);
            if (typeof logCallback === 'function') logCallback(errorMsg);
            return reject(new Error(errorMsg));
        }

        // Разделяем команду на исполняемый файл и аргументы
        const args = command.split(' ');
        const ffmpegPath = args.shift(); // Первый элемент — путь к FFmpeg

        if (!ffmpegPath) {
            const errorMsg = 'FFmpeg path is not specified.';
            logger.error(errorMsg);
            if (typeof logCallback === 'function') logCallback(errorMsg);
            return reject(new Error(errorMsg));
        }

        const commandMsg = `FFMPEG COMMAND: ${command}`;
        logger.info(commandMsg);
        if (typeof logCallback === 'function') logCallback(commandMsg);

        // Запускаем процесс FFmpeg
        const ffmpegProcess = spawn(ffmpegPath, args);

        // Обработчик ошибок при запуске процесса
        ffmpegProcess.on('error', (err) => {
            const errorMsg = `FFMPEG ERROR: ${err.message}`;
            logger.error(errorMsg);
            if (typeof logCallback === 'function') logCallback(errorMsg);
            reject(new Error(errorMsg));
        });

        // Обработчик стандартного вывода (stdout)
        ffmpegProcess.stdout.on('data', (data) => {
            const output = `FFMPEG OUTPUT: ${data.toString()}`;
            logger.info(output);
            if (typeof logCallback === 'function') logCallback(output);
        });

        // Обработчик стандартного вывода ошибок (stderr)
        ffmpegProcess.stderr.on('data', (data) => {
            const errorOutput = `FFMPEG STDERR: ${data.toString()}`;
            logger.error(errorOutput);
            if (typeof logCallback === 'function') logCallback(errorOutput);
        });

        // Обработчик завершения процесса
        ffmpegProcess.on('close', (code, signal) => {
            const closeMsg = `FFMPEG PROCESS CLOSED WITH CODE ${code} AND SIGNAL ${signal}`;
            logger.info(closeMsg);
            if (typeof logCallback === 'function') logCallback(closeMsg);
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg exited with code ${code}`));
            }
        });
    });
}

module.exports = {
    sendCommandToFFMPEG,
};
