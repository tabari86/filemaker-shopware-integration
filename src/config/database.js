const mongoose = require("mongoose");
const config = require("./env");

async function connectDatabase() {
  await mongoose.connect(config.mongodbUri, {
    dbName: config.mongodbDbName,
    serverSelectionTimeoutMS: 10000
  });
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

async function pingDatabase() {
  if (!isDatabaseConnected() || !mongoose.connection.db) {
    throw new Error("Database unavailable");
  }

  await mongoose.connection.db.admin().ping();
  return true;
}

module.exports = { connectDatabase, disconnectDatabase, isDatabaseConnected, pingDatabase };
