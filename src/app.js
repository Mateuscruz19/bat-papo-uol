import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

try {
    await mongoClient.connect();
} catch (err) {
    console.log("Erro no mongo.conect", err.message);
    }
    
    db = mongoClient.db("Uol");
    const Participants = db.collection("participants");
    const Maintenance = db.collection("maintenance")
    const Messages = db.collection("Messages")
    const today = Date.now();






app.listen(process.env.PORT, () => console.log(`Server running in port: ${process.env.PORT}`));