const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("./models/Product");

mongoose.connect(process.env.MONGO_URI);

const products = [
  {
    sku:             "MUB-0001",
    name:            "Meat Pie",
    description:     "Flaky crust packed with juicy minced beef.",
    fullDescription: "Golden baked pastry filled with seasoned minced beef and spices.",
    category:        "Pastries",
    images:          [],
    ingredients:     ["Minced Beef", "Flour", "Butter", "Spices"],
    options: [
      { label: "Single Pastry",         price: 5.50  },
      { label: "Trio Collection",       price: 16.50 },
      { label: "Grand Dozen (Box of 12)", price: 66.00 },
    ],
    active: true,
  },
  {
    sku:             "MUB-0002",
    name:            "Chicken Pie",
    description:     "Golden baked pastry filled with seasoned chicken.",
    fullDescription: "Golden baked pastry filled with seasoned chicken and vegetables.",
    category:        "Pastries",
    images:          [],
    ingredients:     ["Chicken", "Vegetables", "Butter", "Flour"],
    options: [
      { label: "Single Pastry",         price: 5.50  },
      { label: "Trio Collection",       price: 16.50 },
      { label: "Grand Dozen (Box of 12)", price: 66.00 },
    ],
    active: true,
  },
  {
    sku:             "MUB-0003",
    name:            "Puff Puff",
    description:     "Light and airy fried dough balls.",
    fullDescription: "Soft and fluffy fried dough balls with a golden crispy finish.",
    category:        "Pastries",
    images:          [],
    ingredients:     ["Flour", "Sugar", "Yeast", "Oil"],
    options: [
      { label: "Single Pastry",         price: 4.00  },
      { label: "Trio Collection",       price: 12.00 },
      { label: "Grand Dozen (Box of 12)", price: 48.00 },
    ],
    active: true,
  },
  {
    sku:             "MUB-0004",
    name:            "Fish Roll",
    description:     "Soft baked roll stuffed with fish.",
    fullDescription: "Soft baked pastry filled with delicious fish mixture and spices.",
    category:        "Pastries",
    images:          [],
    ingredients:     ["Fish", "Flour", "Spices", "Butter"],
    options: [
      { label: "Single Pastry",         price: 6.50  },
      { label: "Trio Collection",       price: 19.50 },
      { label: "Grand Dozen (Box of 12)", price: 78.00 },
    ],
    active: true,
  },
  {
    sku:             "MUB-0005",
    name:            "Tigernut Drink",
    description:     "Creamy traditional tigernut drink.",
    fullDescription: "Refreshing creamy tigernut drink blended naturally.",
    category:        "Drinks",
    images:          [],
    ingredients:     ["Tigernut", "Water", "Dates"],
    options: [
      { label: "Regular Cup",    price: 6.50  },
      { label: "Large Cup",      price: 9.50  },
      { label: "Family Bottle",  price: 18.00 },
    ],
    active: true,
  },
  {
    sku:             "MUB-0006",
    name:            "Fruity Zobo with Sugar",
    description:     "Refreshing hibiscus drink.",
    fullDescription: "Sweet hibiscus drink infused with fruity flavors.",
    category:        "Drinks",
    images:          [],
    ingredients:     ["Hibiscus", "Sugar", "Fruit Extract"],
    options: [
      { label: "Regular Cup",   price: 6.50  },
      { label: "Large Cup",     price: 9.50  },
      { label: "Family Bottle", price: 18.00 },
    ],
    active: true,
  },
  {
    sku:             "MUB-0007",
    name:            "Fruity Zobo with Date",
    description:     "Naturally sweetened hibiscus drink.",
    fullDescription: "Rich hibiscus drink naturally sweetened with dates.",
    category:        "Drinks",
    images:          [],
    ingredients:     ["Hibiscus", "Dates", "Water"],
    options: [
      { label: "Regular Cup",   price: 6.50  },
      { label: "Large Cup",     price: 9.50  },
      { label: "Family Bottle", price: 18.00 },
    ],
    active: true,
  },
  {
    sku:             "MUB-0008",
    name:            "Zobo & Tigernut Combo",
    description:     "Refreshing zobo and tigernut mix.",
    fullDescription: "Fusion of fruity zobo and creamy tigernut drink.",
    category:        "Drinks",
    images:          [],
    ingredients:     ["Hibiscus", "Tigernut", "Dates"],
    options: [
      { label: "Regular Combo", price: 8.50  },
      { label: "Large Combo",   price: 12.50 },
      { label: "Family Combo",  price: 22.00 },
    ],
    active: true,
  },
];

const seed = async () => {
  try {
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log(`✅ ${products.length} products seeded successfully.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
};

seed();
