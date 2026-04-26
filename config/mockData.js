const restaurants = [
  { _id: "1", name: "Taco Loco",     cuisine: ["Mexican"], rating: 4.5, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400", deliveryTime: "30 min", deliveryFee: 1.99, minOrder: 10, isOpen: true,  description: "Authentic Mexican street food" },
  { _id: "2", name: "Burger Barn",   cuisine: ["Burgers"], rating: 4.2, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", deliveryTime: "25 min", deliveryFee: 0.99, minOrder: 8,  isOpen: true,  description: "Juicy handcrafted burgers" },
  { _id: "3", name: "Sushi Station", cuisine: ["Sushi"],   rating: 4.7, image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400", deliveryTime: "40 min", deliveryFee: 2.49, minOrder: 15, isOpen: true,  description: "Fresh Japanese cuisine" },
  { _id: "4", name: "Pizza Palace",  cuisine: ["Pizza"],   rating: 4.3, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400", deliveryTime: "35 min", deliveryFee: 1.49, minOrder: 12, isOpen: true,  description: "Wood-fired artisan pizzas" },
  { _id: "5", name: "Curry Kingdom", cuisine: ["Indian"],  rating: 4.6, image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400", deliveryTime: "30 min", deliveryFee: 1.99, minOrder: 10, isOpen: false, description: "Rich and aromatic curries" },
];

const menus = {
  "1": [
    { _id: "101", name: "Tacos",   price: 199, description: "3 classic beef tacos",    category: "Mains"  },
    { _id: "102", name: "Burrito", price: 249, description: "Stuffed chicken burrito", category: "Mains"  },
    { _id: "103", name: "Nachos",  price: 179, description: "Loaded cheese nachos",    category: "Snacks" },
  ],
  "2": [
    { _id: "201", name: "Classic Burger", price: 199, description: "Beef patty with lettuce & cheese", category: "Burgers" },
    { _id: "202", name: "Veggie Burger",  price: 179, description: "Plant-based patty",                category: "Burgers" },
    { _id: "203", name: "Fries",          price: 99,  description: "Crispy golden fries",              category: "Sides"   },
  ],
  "3": [
    { _id: "301", name: "Salmon Roll", price: 349, description: "8 pcs fresh salmon", category: "Rolls" },
    { _id: "302", name: "Dragon Roll", price: 399, description: "Avocado & shrimp",   category: "Rolls" },
    { _id: "303", name: "Miso Soup",   price: 99,  description: "Traditional miso",   category: "Sides" },
  ],
  "4": [
    { _id: "401", name: "Margherita",  price: 299, description: "Classic tomato & mozzarella", category: "Pizza" },
    { _id: "402", name: "Pepperoni",   price: 349, description: "Extra pepperoni",              category: "Pizza" },
    { _id: "403", name: "BBQ Chicken", price: 379, description: "Smoky BBQ base",               category: "Pizza" },
  ],
  "5": [
    { _id: "501", name: "Butter Chicken", price: 299, description: "Creamy tomato curry",       category: "Mains"  },
    { _id: "502", name: "Dal Makhani",    price: 249, description: "Slow-cooked black lentils", category: "Mains"  },
    { _id: "503", name: "Garlic Naan",    price: 49,  description: "Freshly baked naan",        category: "Breads" },
  ],
};

module.exports = { restaurants, menus };
