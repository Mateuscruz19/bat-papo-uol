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
     mongoClient.connect();
     db = mongoClient.db();
} catch (err) {
    console.log("Erro no mongo.conect", err.message);
    }
    
    const Participants = db.collection("participants");
    const Maintenance = db.collection("maintenance")
    const Messages = db.collection("Messages")
    const today = Date.now();

app.post("/participants", async (req,res) => {

    const { name } = req.body

    if(typeof name != 'string' || !name) return res.status(422)

    try {
        const participantsExists = await Participants.findOne({ name });
        if(participantsExists) {
        return res.sendStatus(409);
    }

    await Participants.insertOne({ name, lastStatus: today})

    await Messages.insertOne({
        from: name,
        to: "Todos",
        text: "entrei na sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss")
    })

    res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
})


// app.get("/participants", (req,res) => {
    
// })

// app.post("/messages", (req,res) => {

// })

// app.get("/messages", (req,res) => {

// })

// app.get("/status", (req,res) => {

// })



app.listen(process.env.PORT, () => console.log(`Server running in port: ${process.env.PORT}`));