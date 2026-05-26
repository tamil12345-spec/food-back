require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI); // changed to MONGODB_URI

  const hashed = await bcrypt.hash('Admin@9876!', 12);

  await User.findOneAndUpdate(
    { email: 'admin@foodapp.com' },
    { password: hashed, role: 'admin' },
    { upsert: true, new: true }
  );

  console.log('✅ Admin password fixed');
  await mongoose.disconnect();
}

fix().catch(console.error);