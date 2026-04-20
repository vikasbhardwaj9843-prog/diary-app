const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.DB, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  }
});

console.log(client);

let db = null;

let connectDB = async () => {
    try {
        await client.connect();
        console.log(client);
        db = client.db("diary");
        console.log("DB connected");
    } catch (err) {
        console.log("DB connection error : ", err);
        db = null;
        client.close();
    } finally {

        return db;
    }
}

let disconnectDB = async () => {
    await client.close();
    console.log("DB disconnected");
}

let clearActive = async (db) => {
    await db.collection("activeusers").deleteMany({});
}

let createToken = async (db, name) => {
    let active = await db.collection("activeusers");
    let checkuser = await active.findOne({ username: name });
    let tk;
    let check;
    let count = await active.countDocuments();
    let maxactive = process.env.MAXACTIVE;
    if (count < maxactive) {
        if (checkuser) {
            return checkuser.token;
        }

        do {
            tk = Math.floor((Math.random() * 1000000000)+66451848);
            check = await active.findOne({ token: tk });
        } while (check);

        let insert = await active.insertOne({
            username: name,
            token: tk
        })

        setTimeout(async (tk) => {
            await active.deleteOne({ token: tk });
            console.log(`${name}'s session expired`);

        }, 60 * 60 * 1000, tk);

        return tk;
    } else {
        return null;
    }
}




module.exports = { connectDB, disconnectDB, clearActive, createToken };