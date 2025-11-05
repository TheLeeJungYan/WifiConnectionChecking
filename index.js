// Import Express
const express = require("express");
const { createLogger, transports, format } = require("winston");
const moment = require("moment-timezone");
const mysql = require("mysql2/promise");

const path = require("path");
const app = express();
const port = 4000;
const genericPool = require("generic-pool");
const dotenv = require("dotenv");

dotenv.config();
const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
};
const PoolDB = genericPool.createPool(
  {
    create: () => mysql.createConnection(config),
    destroy: (connection) => connection.end(),
    validate: (connection) =>
      connection.query(`SELECT 1`).then(
        () => true,
        () => false
      ),
  },
  {
    max: 5,
    min: 0,
    testOnBorrow: true,
  }
);
const db = {
  execute: async (sql, values, cb) => {
    let conn;
    try {
      conn = await PoolDB.acquire();
      const r = await conn.execute(sql, values, cb);
      await PoolDB.release(conn);
      return r;
    } catch (e) {
      if (conn) await PoolDB.destroy(conn);
      mainLogger.error("database error, " + e);
      throw e;
    }
  },
};
const logDirectory = path.join(
  "C:",
  "wamp64",
  "www",
  "wifiConnectionChecking",
  "logs"
);
const timezoned = () => {
  return moment().tz("Asia/Kuala_Lumpur").format("YYYY-MM-DD HH:mm:ss");
};

const mainLogger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: timezoned }),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new transports.File({
      filename: path.join(logDirectory, "info.log"),
      level: "info",
      format: format.combine(
        format.timestamp({
          format: timezoned,
        }),
        format.json()
      ),
    }),

    new transports.File({
      filename: path.join(logDirectory, "error.log"),
      level: "error",
      format: format.combine(
        format.timestamp({
          format: timezoned,
        }),
        format.json()
      ),
    }),
  ],
});

app.get("/", async (req, res) => {
  res.send("Hello, world!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

async function fetchData() {
  console.log("Fetching Data");
  try {
    const result = await db.execute("SELECT 1");

    mainLogger.info("success fetching data");
  } catch (error) {
    mainLogger.error("error fetching data, " + error);
  }
}

let previousStatus = null;
const checkWifiConnection = async () => {
  const isOnline = (await import("is-online")).default;
  const online = await isOnline();
  if (online && previousStatus !== true) {
    mainLogger.info("WiFi is connected");
  } else if (!online && previousStatus !== false) {
    mainLogger.error("WiFi is disconnected");
  }
  previousStatus = online;
};
checkWifiConnection();
setInterval(checkWifiConnection, 60000);
fetchData();
setInterval(fetchData, 60000);
