require('dotenv').config();
const mongoose = require('mongoose');
const { Restaurant } = require('./models/Restaurant');
const User = require('./models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await Restaurant.deleteMany({});
  await User.deleteMany({ role: 'admin' });

  // Create admin
  await User.create({
    name: 'Admin',
    email: 'admin@foodapp.com',
    password: 'admin123',
    role: 'admin',
  });

  // Create restaurants
  await Restaurant.insertMany([
    {
      name: 'Burger Palace',
      description: 'Best burgers in town with fresh ingredients',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
      cuisine: ['American', 'Burgers'],
      address: '123 Main St',
      rating: 4.5,
      deliveryTime: '25-35 min',
      deliveryFee: 1.99,
      minOrder: 8,
      isOpen: true,
      menu: [
        { name: 'Classic Burger', description: 'Beef patty with lettuce, tomato, cheese', price: 8.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
        { name: 'Cheese Burger', description: 'Double cheese with special sauce', price: 10.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=400' },
        { name: 'Fries', description: 'Crispy golden fries', price: 3.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400' },
        { name: 'Milkshake', description: 'Creamy vanilla milkshake', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400' },
      ],
    },
    {
      name: 'Pizza Corner',
      description: 'Authentic Italian pizzas baked in wood fire oven',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
      cuisine: ['Italian', 'Pizza'],
      address: '456 Oak Ave',
      rating: 4.7,
      deliveryTime: '30-45 min',
      deliveryFee: 2.99,
      minOrder: 12,
      isOpen: true,
      menu: [
        { name: 'Margherita', description: 'Classic tomato and mozzarella', price: 12.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400' },
        { name: 'Pepperoni', description: 'Loaded with pepperoni', price: 14.99, category: 'Pizza', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400' },
        { name: 'Garlic Bread', description: 'Toasted with garlic butter', price: 4.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1619531040576-f9416740661d?w=400' },
        { name: 'Tiramisu', description: 'Classic Italian dessert', price: 6.99, category: 'Desserts', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400' },
      ],
    },
    {
      name: 'Sushi World',
      description: 'Fresh sushi and Japanese cuisine',
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600',
      cuisine: ['Japanese', 'Sushi'],
      address: '789 Pine St',
      rating: 4.8,
      deliveryTime: '35-50 min',
      deliveryFee: 3.99,
      minOrder: 15,
      isOpen: true,
      menu: [
        { name: 'Salmon Roll', description: 'Fresh salmon with avocado', price: 13.99, category: 'Rolls', image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400' },
        { name: 'Tuna Nigiri', description: 'Fresh tuna over rice', price: 11.99, category: 'Nigiri', image: 'https://images.unsplash.com/photo-1562802378-063ec186a863?w=400' },
        { name: 'Miso Soup', description: 'Traditional Japanese soup', price: 3.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400' },
        { name: 'Green Tea Ice Cream', description: 'Matcha flavored ice cream', price: 5.99, category: 'Desserts', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400' },
      ],
    },
  ]);

  console.log('✅ Seed data inserted');
  console.log('👤 Admin: admin@foodapp.com / admin123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });