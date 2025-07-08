import mongoose from 'mongoose';

declare global {
  var mongoose: { conn: mongoose.Mongoose | null };
}

let cached: { conn: mongoose.Mongoose | null } = global.mongoose ?? { conn: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  mongoose.set('strictQuery', false);
  
  const conn = await mongoose.connect(process.env.MONGO_DB!);
  console.log("Connected to MongoDB.");
  
  cached.conn = conn;
  return conn;
}

export default dbConnect;