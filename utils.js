const fs = require('fs');
const path = require('path');

function parseISODate(isoDateStr) {
  return new Date(isoDateStr);
}

function loadSchedule(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    console.warn(`SCHEDULE FILE NOT FOUND: ${absolutePath}`);
    return [];
  }

  const data = fs.readFileSync(absolutePath, 'utf8');
  let scheduleItems = JSON.parse(data);

  scheduleItems.sort((a, b) => {
    return new Date(a.startAt) - new Date(b.startAt);
  });

  return scheduleItems;
}

module.exports = { parseISODate, loadSchedule };
