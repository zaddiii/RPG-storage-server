
import express from "express";
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ MONGO_URI not set");
  process.exit(1);
}

const app = express();
app.use(express.json());

let dbClient;

async function connectMongo() {
  try {
    dbClient = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await dbClient.connect();
    console.log("✅ Connected to MongoDB!");
    await dbClient.db("admin").command({ ping: 1 });
    console.log("✅ Pinged database successfully!");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

app.get("/", (req, res) => res.send("Server is running!"));

const PORT = process.env.PORT || 3000;
connectMongo().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
});