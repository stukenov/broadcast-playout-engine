const https = require('https');
const os = require('os');

/**
 * Функция для получения начальных данных сервера
 */
function getInitData() {
    return new Promise((resolve, reject) => {
      const cpus = os.cpus();
      const cpuCount = cpus.length;
      const totalMem = 0;
      const serverName = process.env.SERVER_NAME || os.hostname();
      resolve({
        serverName,
        resources: {
          cpu: cpuCount,
          totalMemory: totalMem,
        },
      });
    });
  }

  
  
/**
 * Функция для регистрации сервера у вызывающего сервера
 */
function registerWithCaller(initData) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(initData);
  
      const options = {
        hostname: process.env.CONSOLE_HOST || 'localhost',
        port: parseInt(process.env.CONSOLE_PORT, 10) || 6000,
        path: '/adapto/servers/register',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${process.env.LICENSE_KEY || 'ABCD-EFGH-IJKL-MNOP'}`,
        },
        rejectUnauthorized: false, // Отключаем проверку сертификата
      };
  
      const req = https.request(options, (res) => {
        if (res.statusCode === 200) {
          console.log('Successfully registered with caller.');
          resolve();
        } else {
          console.error(`Failed to register with caller. Status code: ${res.statusCode}`);
          reject(new Error(`Registration failed with status code ${res.statusCode}`));
        }
      });
  
      req.on('error', (e) => {
        console.error(`Problem with registration request: ${e.message}`);
        reject(e);
      });
  
      req.write(postData);
      req.end();
    });
  }

module.exports = {
    getInitData,
    registerWithCaller
};
