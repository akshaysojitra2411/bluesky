const mongoose = require('mongoose');

const ATLAS_URI = 'mongodb+srv://pritesh029_db_user:VUOiNCEpVNbpA6sC@cluster0.sqhapkd.mongodb.net/crystal_pools?retryWrites=true&w=majority';

let isConnected = false;
let connectionPromise = null;

// Connect MongoDB with caching for serverless environments (Vercel)
const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.MONGODB_URI || ATLAS_URI;

  connectionPromise = mongoose.connect(uri, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000
  }).then(conn => {
    isConnected = conn.connections[0].readyState === 1;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  }).catch(error => {
    connectionPromise = null;
    isConnected = false;
    console.error(`❌ DB Error: ${error.message}`);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  });

  return connectionPromise;
};

module.exports = connectDB;
