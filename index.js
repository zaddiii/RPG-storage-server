
// index.js
import express from "express";
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ Error: MONGO_URI environment variable is not set");
  process.exit(1);
}

const app = express();
app.use(express.json());

let dbClient;

async function connectMongo() {
  try {
    dbClient = new MongoClient(mongoUri, {
      serverApi: { version: ServerApiVersion.v1 },
    });

    await dbClient.connect();
    console.log("✅ Connected to MongoDB successfully!");
    await dbClient.db("admin").command({ ping: 1 });
    console.log("✅ Pinged MongoDB deployment. Connection confirmed!");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

app.get("/", (req, res) => {
  res.send("Server is running!");
});

const PORT = process.env.PORT || 3000;
connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });
});