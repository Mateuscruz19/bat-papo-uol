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
        to: joi.string().required(),
        text: joi.string().min(1).required(),
        type: joi.any().valid('message','private_message').required()
    })

    checkInactiveUsers()

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
   

    try {

    
        const Output = req.body;
        const { user } = req.headers
    
        const userValidade = await participants.findOne({ name: user })
        if(!userValidade) return res.sendStatus(422)

    const messagePut = {
        from: user,
        ...Output,
        time: dayjs(Date.now()).format('HH:mm:ss')
    };

    const messageValid  = messageSchema.validate(Output, {abortEarly: false})

    if(messageValid.error){
        return res.sendStatus(422)
    }

    const messageOutput = await messages.insertOne(messagePut);

    if(messageOutput) return res.sendStatus(201);

    } catch (error) {
        console.log(error)

        if(error.isJoi) return res.sendStatus;

       return res.sendStatus(500);
    }

});


app.get("/messages", async (req,res) => {

    try {

        const { limit } = req.query ;
        const { user } = req.headers;

        const messageControled = await messages.find({$or: [
            {from: user},
            {to: {$in: [user, "Todos"] } },
        ]})
      .toArray();

        if(limit) {
            const numberLimit = Number(limit)

            if(numberLimit < 1 || isNaN(numberLimit)) return res.sendStatus(422)

            return res.send([...messageControled].slice(-numberLimit).reverse());
        }

        res.send([...messageControled].reverse())
    } catch (err) {
        console.log(err)
        res.sendStatus(500);
    }
 })

app.post("/status", async (req,res) => {

    const { user } = req.headers

        try {   
            const onList = await participants.findOne({ name: user })
            if(!onList) return res.sendStatus(404);
    
        await participants.updateOne(
            {name:user},
            {$set: {lastStatus: Date.now() } }
        );

            res.sendStatus(200);

        } catch (err) {
            console.log(err);
            res.sendStatus(500);
        }
    
 })

 app.delete("/messages/:id", async (req, res) => {
    const requestUser = req.headers.user
    const { id } = req.params

    try {
        const message = await messages.findOne({ _id: ObjectId(id) })

        if (!message) return res.sendStatus(404)

        if (message.from !== requestUser) return res.sendStatus(401)

        await message.deleteOne({ _id: ObjectId(id) })

        return res.sendStatus(200)

    } catch (err) {

        console.log(err)

        return res.sendStatus(500)
    }
})

function checkInactiveUsers() {
    const timeTolerance = 10000

    setInterval(async () => {

        const time = Date.now() - timeTolerance

        try {
            const participantsUpdate = await participants.find().toArray()

            participantsUpdate.forEach(async (p) => {

                if (p.lastStatus < time) {

                    await participants.deleteOne({ _id: ObjectId(p._id) })

                    await messages.insertOne({
                        from: p.name,
                        to: 'Todos',
                        text: 'sai da sala...',
                        type: 'status',
                        time: dayjs(Date.now()).format('HH:mm:ss')
                    })
                }
            })

        } catch (err) {
            console.log(err)
            return res.sendStatus(500)
        }

    }, timeTolerance)
}

app.listen(5000, () => console.log(`Server running in port: 5000`));