const express = require("express");
const { connectDB, disconnectDB, clearActive } = require("./database.js");
const { login, register, deleteAccount, logout, createEntry, updateEntry, deleteEntry, search, toggleFav } = require("./utilities.js");
require("dotenv").config();
const multer = require('multer');
const axios = require("axios");
const path = require('path');


let app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let db;


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images')
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, uniqueSuffix)
    }
});

const upload = multer({ storage: storage });

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/images/index.html");
})

app.post("/api/login", async (req, res) => {
    await login(req, res, db);
});


app.post("/api/register", async (req, res) => {
    await register(req, res, db);
})

app.post("/api/delete-account", async (req, res) => {
    await deleteAccount(req, res, db);
});

app.post("/api/logout", async (req, res) => {
    await logout(req, res, db);
});

app.post("/api/create-entry", upload.single('image'), async (req, res) => {
    await createEntry(req, res, db);
})

app.post("/api/update-entry", upload.single('image'), async (req, res) => {
    await updateEntry(req, res, db);
});

app.post("/api/delete-entry", async (req, res) => {
    await deleteEntry(req, res, db);
});

app.post("/api/toggle-fav", async (req, res) => {
    await toggleFav(req, res, db);
});

app.get("/api/search", async (req, res) => {
    await search(req, res, db);
});

app.post("/api/enhance", async (req, res) => {
    try {
        const response = await axios.post(process.env.LLM_API_URL, req.body);
        const generatedText = response.data.results[0].text.trim();
        res.json(generatedText);
    } catch (error) {
        console.error("Error calling LLM API:", error);
        res.status(500).json({ error: "Failed to enhance text" });
    }
});
















let server;
const closeServer = async (server) => {
    await disconnectDB();
    server.close();
    console.log("server has been closed safely");
}

const startServer = async () => {
    db = await connectDB();
    if (!db) {
        console.log("unable to connect to DB");
        return;
    }
    await clearActive(db);
    server = app.listen(process.env.PORT, () => { console.log("server is running at" + process.env.SERVER_URL) });

    setTimeout(async (server) => {
        closeServer(server)
    }, parseInt(process.env.TIMEOUT) * 60 * 1000, server);
}

startServer();