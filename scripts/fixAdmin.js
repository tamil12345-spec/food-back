require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');

// ── Accept password from env or CLI arg — never hardcode ─────────────────────
//    Usage:
//      ADMIN_PASSWORD=MyNewPass node fixAdmin.js
//      node fixAdmin.js MyNewPass
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@foodapp.com';
const ADMIN_PASSWORD = process.argv[2] || process.env.ADMIN_PASSWORD;

async function fix() {
  if (!ADMIN_PASSWORD) {
    console.error('❌ No password provided.');
    console.error('   Usage: node fixAdmin.js <NewPassword>');
    console.error('   Or set ADMIN_PASSWORD in your .env file.');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in your .env file.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // findOneAndUpdate bypasses the pre-save hook — hash manually here, once.
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const result = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { password: hashed, role: 'admin' },
    { upsert: true, new: true }
  );

  console.log(`✅ Admin account updated`);
  console.log(`   Email : ${result.email}`);
  console.log(`   Role  : ${result.role}`);
  console.log(`   ID    : ${result._id}`);

  await mongoose.disconnect();
  console.log('✅ Done. DB connection closed.');
}

fix().catch(err => {
  console.error('❌ Fix failed:', err.message);
  process.exit(1);
});