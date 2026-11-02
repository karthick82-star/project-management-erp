const fs = require('fs');
const path = require('path');
const dotenvPath = fs.existsSync(path.join(__dirname, '..', '.env'))
  ? path.join(__dirname, '..', '.env')
  : path.join(__dirname, '..', '..', '.env');
require('dotenv').config({ path: dotenvPath });

const connectDB = require('../config/db');
const User = require('../models/User');

const updateName = async () => {
  try {
    await connectDB();
    console.log('[Script] Connected to DB. Updating staff name to HOD...');

    const result = await User.updateMany(
      { $or: [{ role: 'staff' }, { email: 'staff@college.edu' }, { name: /Priya/i }] },
      { $set: { name: 'HOD', department: 'Computer Science with Cyber Security' } }
    );

    console.log(`[Script] Updated ${result.modifiedCount} user record(s).`);

    const updatedUsers = await User.find({ role: 'staff' });
    console.log('[Script] Current staff users in DB:');
    updatedUsers.forEach(u => console.log(`  - ${u.name} (${u.email}) [Role: ${u.role}]`));

    process.exit(0);
  } catch (err) {
    console.error('[Script Error]', err);
    process.exit(1);
  }
};

updateName();

