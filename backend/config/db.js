const mongoose = require('mongoose');
const dns = require('dns');

// On Windows, SRV records for mongodb+srv often trigger ECONNREFUSED with local DNS.
// Setting Google / Cloudflare public DNS ensures reliable Atlas connection.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore fallback if restricted
}

const connectDB = async () => {
  if (mongoose.connection && mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb+srv://easccybersecurity_db_user:karthickjkjk@cluster0.zlqehz7.mongodb.net/campuserp?retryWrites=true&w=majority';
    const conn = await mongoose.connect(connStr);
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;

