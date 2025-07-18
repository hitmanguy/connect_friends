import mongoose from "mongoose";
import { startChangeStreams } from "../services/changeStream";

declare global {
  var mongoose: {
    conn: mongoose.Mongoose | null;
    changeStreamsStarted: boolean;
  };
}

let cached: { conn: mongoose.Mongoose | null; changeStreamsStarted: boolean } =
  global.mongoose ?? { conn: null, changeStreamsStarted: false };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  mongoose.set("strictQuery", false);

  const conn = await mongoose.connect(process.env.MONGO_DB!);
  console.log("Connected to MongoDB.");

  cached.conn = conn;

  if (!cached.changeStreamsStarted) {
    try {
      setTimeout(() => {
        startChangeStreams();
        cached.changeStreamsStarted = true;
        console.log("Change streams initialized.");
      }, 1000);
    } catch (error) {
      console.error("Failed to start change streams:", error);
    }
  }

  return conn;
}

export default dbConnect;
