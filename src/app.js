import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import joi from "joi";

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

    const participantsSchema = joi.object({
        name: joi.string().required().min(3)
    });

    const messageSchema = joi.object({
        from: joi.string().required(),
        to: joi.string().required().min(3),
        text: joi.string().required().min(1),
        type: joi.string().required().valid("message", "private_message"),
        time: joi.string(),
    })






const mongoClient = new MongoClient(process.env.DATABASE_URI);
let db;

try {
     mongoClient.connect();
     db = mongoClient.db();
} catch (err) {
    console.log("Erro no mongo.conect", err.message);
    }
    
    const participants = db.collection("participants");
    const Maintenance = db.collection("maintenance")
    const Messages = db.collection("Messages")
    const today = Date.now();

app.post("/participants", async (req,res) => {

    const { name } = req.body

    const { error } = participantsSchema.validate({ name }, { abortEarly: false })

    if(error) {
        const errors = error.details.map((d) => d.message);
        return res.status(422).send(errors)
    }

    try {
        const participantsExists = await participants.findOne({ name });
        if(participantsExists) {
        return res.sendStatus(409);
    }


    await participants.insertOne({ name, lastStatus: today})

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