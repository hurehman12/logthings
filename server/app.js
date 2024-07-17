const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = 3000;
const logFile = path.join(__dirname, 'log.csv');
const maxLines = 20;


if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, 'Agent,Time,Method,Resource,Version,Status\n');
}

// Function to format the log entry
const formatLogEntry = (req, res) => {
  const agent = req.headers['user-agent'].replace(/,/g, ''); 
  const time = new Date().toISOString();
  const method = req.method;
  const resource = req.originalUrl;
  const version = `HTTP/${req.httpVersion}`;
  const status = res.statusCode;

  return `${agent},${time},${method},${resource},${version},${status}\n`;
};

// Middleware to log request data to log.csv
app.use((req, res, next) => {
  res.on('finish', () => {
    const logEntry = formatLogEntry(req, res);
    fs.appendFile(logFile, logEntry, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      } else {
        rotateLogsIfNeeded();
      }
    });
    console.log(logEntry.trim());
  });
  next();
});

// Route to return "ok" for all requests
app.get('/', (req, res) => {
  res.status(200).send('ok');
});

// Endpoint to return logs as JSON
app.get('/logs', (req, res) => {
  fs.readFile(logFile, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading log file');
    }

    const lines = data.trim().split('\n');
    const headers = lines[0].split(',');
    const logs = lines.slice(1).map(line => {
      const logData = line.split(',');
      const logObject = {};
      headers.forEach((header, index) => {
        logObject[header.trim()] = logData[index] ? logData[index].trim() : null;
      });
      return logObject;
    });

    res.json(logs);
  });
});

// Middleware to handle 404 errors
app.use((req, res) => {
  res.status(404).send('Resource not found');
});

// Function to rotate logs if needed
const rotateLogsIfNeeded = () => {
  fs.readFile(logFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading log file for rotation:', err);
      return;
    }

    const lines = data.trim().split('\n');
    if (lines.length > maxLines + 1) { 
      rotateLogs();
    }
  });
};

// Function to rotate logs
const rotateLogs = () => {
  for (let i = 4; i >= 1; i--) {
    const oldPath = path.join(__dirname, `log${i}.csv`);
    const newPath = path.join(__dirname, `log${i + 1}.csv`);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }
  }

  const firstLogPath = path.join(__dirname, 'log.csv');
  const rotatedLogPath = path.join(__dirname, 'log1.csv');
  fs.renameSync(firstLogPath, rotatedLogPath);
  fs.writeFileSync(logFile, 'Agent,Time,Method,Resource,Version,Status\n');
};



module.exports = app;
