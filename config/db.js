const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`Database connected successfully!: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to DB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;