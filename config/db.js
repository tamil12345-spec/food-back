const User  = require('./models/User');
const Order = require('./models/Order');
await User.create(newUser);
await Order.findById(id);