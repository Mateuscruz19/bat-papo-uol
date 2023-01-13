import express, { query } from "express";
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


const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

try {
     mongoClient.connect();
     db = mongoClient.db();
} catch (err) {
    console.log("Erro no mongo.conect", err.message);
    }
    
    const participants = db.collection("participants");
    const messages = db.collection("messages")
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

    await messages.insertOne({
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss")
    })

    res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
})


app.get("/participants", async (req, res) => {
    
    try {
       const online = await participants.find().toArray();

       return res.send(online)
    } catch (error) {
        console.log(error)
        return res.status(500);
    } 

})

app.post("/messages", async (req,res) => {

    const { to, text, type } = req.body
    const { User } = req.headers

    const message = {
        from: User,
        to,
        text,
        type,
        time: dayjs().format("HH:mm:ss")
    };

    try {
        const { error } = messageSchema.validate(message,{abortEarly:false});

        if(error) {
            const errors = error.details.map(d => d.message);
            return res.status(422).send(errors)
        };

        await messages.insertOne(message);
        res.sendStatus(201);
    } catch (error) {
        console.log(err)
        res.sendStatus(500);
    }

});

app.get("/messages", async (req,res) => {

    const limit  = Number(req.query.limit);
    const { User } = req.headers;

    if(!limit){
        const allMessages = messages.find();
        res.send(allMessages)
    }

    try {
        const messages = await messages.find({$or: [
            {from: User},
            {to: {$in: [User, "Todos"] } },
            {type:"message"}
        ]})
        .limit(limit)
      .toArray();

    } catch (err) {
        console.log(err)
        res.sendStatus(500);
    }
 })

app.post("/status", async (req,res) => {
    const { User } = req.headers
        try {   
            const onList = await participants.findOne({ name: User })
            if(!onList) return res.sendStatus(404);
    
        await participants.updateOne(
            {name:User},
            {$set: {lastStatus: today } }
        );

            res.sendStatus(200);

        } catch (err) {
            console.log(err);
            res.sendStatus(500);
        }
    
 })

setInterval(async () => {

    const timeRemove = today - 10000;

    try {
        
        const layoff = await participants.find( {lastStatus: {$lte: timeRemove}}).toArray();

        if(layoff.length > 0) {
            const leaveNotice = participants.map((p) => {
                return {
                    from: p.name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs().format("HH:mm:ss"),
                };
            });

            await messages.insertMany(leaveNotice)
            await participants.deleteMany( {lastStatus: { $lte: timeRemove}})
        }

    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
}, 15000);


app.listen(5000, () => console.log(`Server running in port: 5000`));