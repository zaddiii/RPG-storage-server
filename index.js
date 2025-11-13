



// index.js
import express from "express";
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

// === Ensure environment variable is set ===
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ Error: MONGO_URI environment variable is not set");
  process.exit(1);
}

// === Create Express app ===
const app = express();
app.use(express.json());

// === Connect to MongoDB ===
let dbClient;

async function connectMongo() {
  try {
    dbClient = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      ssl: true, // force SSL
      tlsAllowInvalidCertificates: false,
    });

    await dbClient.connect();
    console.log("✅ Connected to MongoDB successfully!");

    // Optional: verify connection
    await dbClient.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your MongoDB deployment. Connection confirmed!");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

// === Simple test route ===
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// === Start server after MongoDB connects ===
const PORT = process.env.PORT || 3000;
connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });
});