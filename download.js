const fs = require('fs');
const path = require('path');
const logger = require('./logger'); // Импортируем logger
const https = require('https');

/**
 * Функция для скачивания файла с удаленного сервера
 * @param {string} url - URL для скачивания
 * @param {function} logCallback - Функция для отправки логов
 * @returns {Promise<void>}
 */
function downloadFromRemoteServer(url, logCallback) {
    return new Promise((resolve, reject) => {
        // url example: https://localhost:3000/videos/1/download	
        // 1 - id of video
        const id = url.split('/')[5];
        const fileName = `video_${id}.mp4`;
        const downloadPath = path.join(__dirname, 'download', fileName);
        const file = fs.createWriteStream(downloadPath);

        const startMsg = `Starting download from: ${url}`;
        logger.info(startMsg);
        if (typeof logCallback === 'function') logCallback(startMsg);

        const request = https.get(url, (response) => {
            const statusMsg = `Response received with status code: ${response.statusCode}`;
            logger.info(statusMsg);
            if (typeof logCallback === 'function') logCallback(statusMsg);
            response.pipe(file);
        });

        request.on('error', (error) => {
            const errorMsg = `Error downloading file: ${error.message}`;
            logger.error(errorMsg);
            if (typeof logCallback === 'function') logCallback(errorMsg);
            reject(new Error(errorMsg));
        });

        file.on('finish', () => {
            const successMsg = `File downloaded and saved to ${downloadPath}`;
            logger.info(successMsg);
            if (typeof logCallback === 'function') logCallback(successMsg);
            resolve();
        });

        file.on('error', (error) => {
            const errorMsg = `Error saving file: ${error.message}`;
            logger.error(errorMsg);
            if (typeof logCallback === 'function') logCallback(errorMsg);
            reject(new Error(errorMsg));
        });
    });
}

module.exports = {
    downloadFromRemoteServer
};
