



import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db("rpg_game");
const players = db.collection("players");

const PORT = process.env.PORT || 3000;

// === Get player info ===
app.get("/player/:id", async (req,res)=>{
  const player = await players.findOne({_id:req.params.id});
  if(player) res.json(player);
  else {
    // If player doesn't exist, create default
    const newPlayer = {
      _id: req.params.id,
      tokens: 1000,
      hp: 200,
      mp: 50,
      attackUpgrade: 0,
      specialUpgrade: 0
    };
    await players.insertOne(newPlayer);
    res.json(newPlayer);
  }
});

// === Update player info ===
app.post("/player/:id", async (req,res)=>{
  const update = req.body;
  await players.updateOne({_id:req.params.id}, { $set: update }, { upsert:true });
  res.json({ ok:true });
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
