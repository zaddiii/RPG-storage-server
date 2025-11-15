
// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

let db;

// ===========================
// 📌 CONNECT TO MONGODB
// ===========================
async function connectMongo() {
  try {
    const client = new MongoClient(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db();
    console.log("✅ Connected to MongoDB Atlas!");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

// Create default player for testing
async function createPlayerIfNotExists(playerId) {
  const existing = await db.collection("players").findOne({ id: playerId });
  if (!existing) {
    await db.collection("players").insertOne({
      id: playerId,
      tokens: 1000,
      hp: 200,
      mp: 50,
      enemyHp: 200,
      enemyMp: 50,
      enemyMaxHP: 200,
      enemyMaxMP: 50,
      enemyIQ: 0,
      attackUpgrade: 0,
      specialUpgrade: 0,
      nfts: [],
      equippedNFT: null
    });
    console.log(`✅ Created default player: ${playerId}`);
  }
}

// ===========================
// 📌 BASIC ROUTES
// ===========================
app.get("/", (req, res) => res.send("RPG Server is running!"));

// Fetch all players
app.get("/players", async (req, res) => {
  try {
    const players = await db.collection("players").find().toArray();
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// Fetch single player
app.get("/players/:id", async (req, res) => {
  const playerId = req.params.id;

  try {
    const player = await db.collection("players").findOne({ id: playerId });

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json(player);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch player" });
  }
});

// Update or create player
app.post("/players/:id", async (req, res) => {
  const playerId = req.params.id;
  const updateData = req.body;

  try {
    await db.collection("players").updateOne(
      { id: playerId },
      { $set: updateData },
      { upsert: true }
    );

    res.json({ success: true, updated: updateData });
  } catch (err) {
    res.status(500).json({ error: "Failed to update player" });
  }
});


// ===========================
// 📌 LEADERBOARD SYSTEM
// ===========================

// Submit score
app.post("/leaderboard", async (req, res) => {
  const { playerId, name, score, tokens } = req.body;

  if (!playerId) return res.status(400).json({ error: "playerId required" });

  const entry = {
    playerId,
    name: name || playerId,
    score: Number(score || 0),
    tokens: Number(tokens || 0),
    updatedAt: new Date(),
  };

  try {
    await db.collection("leaderboard").updateOne(
      { playerId },
      { $set: entry },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Leaderboard update failed" });
  }
});

// Get top leaderboard
app.get("/leaderboard/top", async (req, res) => {
  const limit = Math.min(100, Number(req.query.limit || 10));

  try {
    const top = await db
      .collection("leaderboard")
      .find()
      .sort({ score: -1, updatedAt: -1 })
      .limit(limit)
      .toArray();

    res.json(top);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// Weekly reward
app.post("/leaderboard/distribute-weekly", async (req, res) => {
  const prizes = [1000, 500, 300, 200, 100];

  try {
    const leaderboard = await db
      .collection("leaderboard")
      .find()
      .sort({ score: -1 })
      .limit(prizes.length)
      .toArray();

    for (let i = 0; i < leaderboard.length; i++) {
      const winner = leaderboard[i];
      const reward = prizes[i];

      await db.collection("players").updateOne(
        { id: winner.playerId },
        { $inc: { tokens: reward } }
      );
    }

    res.json({ success: true, winners: leaderboard });
  } catch (err) {
    res.status(500).json({ error: "Reward distribution failed" });
  }
});


// ===========================
// 📌 NFT SYSTEM (SKILLS / ITEMS)
// ===========================

// Mint NFT to player
app.post("/nfts/mint", async (req, res) => {
  const { playerId, nft } = req.body;

  if (!playerId || !nft) {
    return res.status(400).json({ error: "playerId and nft required" });
  }

  try {
    await db.collection("players").updateOne(
      { id: playerId },
      { $push: { nfts: nft } }
    );

    res.json({ success: true, nft });
  } catch (err) {
    res.status(500).json({ error: "Failed to mint NFT" });
  }
});

// Equip NFT
app.post("/nfts/equip", async (req, res) => {
  const { playerId, nftId } = req.body;

  if (!playerId || !nftId) {
    return res.status(400).json({ error: "playerId and nftId required" });
  }

  try {
    const player = await db.collection("players").findOne({ id: playerId });

    if (!player) return res.status(404).json({ error: "Player not found" });
    if (!player.nfts) return res.status(404).json({ error: "No NFTs owned" });

    const nft = player.nfts.find((n) => n.id === nftId);

    if (!nft) return res.status(404).json({ error: "NFT not found" });

    await db.collection("players").updateOne(
      { id: playerId },
      { $set: { equippedNFT: nft } }
    );

    res.json({ success: true, equipped: nft });
  } catch (err) {
    res.status(500).json({ error: "Failed to equip NFT" });
  }
});

// Get player NFTs
app.get("/nfts/:playerId", async (req, res) => {
  const playerId = req.params.playerId;

  try {
    const player = await db.collection("players").findOne(
      { id: playerId },
      { projection: { nfts: 1, equippedNFT: 1 } }
    );

    if (!player) return res.status(404).json({ error: "Player not found" });

    res.json({
      nfts: player.nfts || [],
      equipped: player.equippedNFT || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch NFTs" });
  }
});


// ===========================
// 📌 START SERVER
// ===========================
connectMongo().then(async () => {
  await createPlayerIfNotExists("player123");
  app.listen(PORT, () =>
    console.log(`🚀 Server running on port ${PORT}`)
  );
});