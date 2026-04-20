const { ObjectId } = require("mongodb");
const { createToken } = require("./database.js");
require("dotenv").config();

const login = async (req, res, db) => {
    let { name, pass } = req.body;

    if (!name || !pass) return res.status(400).json({
        status: 400,
        alert: "invalid credentials"
    });

    let check = await db.collection("users").findOne({ username: name });
    if (!check) return res.status(401).json({
        status: 401,
        alert: "incorrect username or password"
    })

    if (check.password == pass) {
        let tk = await createToken(db, name);
        if (tk) {
            return res.status(200).json({
                status: 200,
                token: tk
            });
        } else {
            return res.status(503).json({
                status: 503,
                alert: "active user overflow"
            })
        }
    } else {
        return res.status(401).json({
            status: 401,
            alert: "incorrect username or password"
        });
    }


}

const register = async (req, res, db) => {
    let { name, pass } = req.body;

    if (!name || !pass) return res.status(400).json({
        status: 400,
        alert: "invalid credentials"
    });

    name = name.trim();

    let users = await db.collection("users");
    let check = await users.findOne({ username: name });
    if (check) {
        return res.status(401).json({
            status: 401,
            alert: "username already exists"
        })
    }

    let inserted = await users.insertOne({
        username: name,
        password: pass
    })

    if (inserted.acknowledged !== 0) {
        return res.status(201).json({
            status: 201,
            alert: "account registered"
        })
    } else {
        return res.status(500).json({
            status: 500,
            alert: "unable to register"
        })
    }
}

const deleteAccount = async (req, res, db) => {
    let { tk, name, pass } = req.body;

    if (!tk || !name || !pass) return res.status(400).json({
        status: 400,
        alert: "invalid credentials"
    });

    tk = parseInt(tk);
    let active = await db.collection("activeusers").findOne({ token: tk });

    if (!active) return res.status(401).json({
        status: 401,
        alert: "token expired"
    });

    let user = await db.collection("users").findOne({ username: name, password: pass });

    if (!user) return res.status(403).json({
        status: 403,
        alert: "invalid credentials"
    });


    if (user.username !== name || user.password !== pass) return res.status(403).json({
        status: 403,
        alert: "invalid credentials"
    });

    let delContent = await db.collection("content").deleteMany({ username: name });

    if (!delContent.acknowledged) return res.status(500).json({
        status: 500,
        alert: "unable to delete content >> account deletion failed"
    });

    let delUser = await db.collection("users").deleteOne({ username: name, password: pass });

    if (delUser.deletedCount < 1) return res.status(500).json({
        status: 500,
        alert: "unable to delete user >> account deletion failed"
    });

    let delActive = await db.collection("activeusers").deleteOne({ token: tk });

    if (delActive.deletedCount < 1) console.log("unable to end session >> account deleted but token still active");

    return res.status(200).json({
        status: 200,
        alert: "account deleted successfully"
    });
}

const logout = async (req, res, db) => {
    let { tk } = req.body;

    if (!tk) return res.status(400).json({
        status: 400,
        alert: "invalid token"
    });

    tk = parseInt(tk);
    let active = await db.collection("activeusers").findOne({ token: tk });

    if (!active) return res.status(200).json({
        status: 200,
        alert: "logout successful"
    });

    let deleted = await db.collection("activeusers").deleteOne({ token: tk });

    if (deleted.deletedCount < 1) return res.status(500).json({
        status: 500,
        alert: "unable to logout"
    });

    return res.status(200).json({
        status: 200,
        alert: "logout successful"
    });
}

const createEntry = async (req, res, db) => {
    let { tk, headings, htag, data, dt, fav } = req.body;

    if (!tk || !headings || !htag || !data || !dt) return res.status(400).json({
        status: 400,
        alert: "invalid entry data"
    });

    tk = parseInt(tk);
    htag = htag.split(" ");
    let iurl = "/images/" + req.file.filename;

    let active = await db.collection("activeusers").findOne({ token: tk });

    if (!active) return res.status(401).json({
        status: 401,
        alert: "token expired"
    });

    let name = active.username;

    let obj = {
        username: name,
        title: headings,
        hashtags: htag,
        image: iurl,
        content: data,
        date: dt,
        fav: fav === 'true' || fav === true
    }

    let check = await db.collection("content").findOne({ date: dt, username: name });

    if (check) return res.status(409).json({
        status: 409,
        alert: "entry with same date already exists"
    });

    let insert = await db.collection("content").insertOne(obj);

    if (insert.acknowledged === 0) return res.status(500).json({
        status: 500,
        alert: "unable to insert entry"
    });

    return res.status(201).json({
        status: 201,
        alert: "entry registered successfully"
    })
}

let updateEntry = async (req, res, db) => {
    let { tk, id, headings, htag, data, fav } = req.body;

    if (!tk || !id || !headings || !htag || !data) return res.status(400).json({
        status: 400,
        alert: "invalid entry data"
    });

    tk = parseInt(tk);
    htag = htag.split(" ");

    let active = await db.collection("activeusers").findOne({ token: tk });

    if (!active) return res.status(401).json({
        status: 401,
        alert: "token expired"
    });

    let obj = {
        title: headings,
        hashtags: htag,
        content: data,
        fav: fav === 'true' || fav === true
    }

    if (req.file) {
        obj.image = "/images/" + req.file.filename;
    }

    id = new ObjectId(id);

    let content = await db.collection("content");
    console.log(content.findOne({ _id: id }));
    let update = await content.updateOne({ _id: id }, { $set: obj });

    if (update.matchedCount === 0) return res.status(500).json({
        status: 500,
        alert: "unable to update entry"
    });

    return res.status(201).json({
        status: 201,
        alert: "entry updated successfully"
    })
}

let deleteEntry = async (req, res, db) => {
    let { tk, id } = req.body;

    if (!tk || !id) return res.status(400).json({
        status: 400,
        alert: "invalid entry data"
    });

    tk = parseInt(tk);
    let active = await db.collection("activeusers").findOne({ token: tk });

    if (!active) return res.status(401).json({
        status: 401,
        alert: "token expired"
    });

    id = new ObjectId(id);
    let deleted = await db.collection("content").deleteOne({ _id: id });

    if (deleted.deletedCount < 1) return res.status(404).json({
        status: 404,
        alert: "entry not found"
    });

    return res.status(200).json({
        status: 200,
        alert: "entry deleted successfully"
    });
}

let search = async (req, res, db) => {
    let { tk, q, htag, sort, page, fav } = req.query;

    tk = parseInt(tk);

    let active = await db.collection("activeusers").findOne({ token: tk });
    if (!active) return res.status(401).json({
        status: 401,
        alert: "token expired"
    });

    let name = active.username;

    if (!sort) sort = "latest";
    page = !page ? 1 : parseInt(page);

    !htag ? htag = [] : htag = htag.split(" ");

    let query;

    if (!q && htag.length < 1) query = {
        username: name
    };

    else if (!q) query = {
        username: name,
        hashtags: { $all: htag },
    };

    else if (htag.length < 1) query = {
        username: name,
        title: { $regex: q, $options: "i" },
    };

    else query = {
        username: name,
        title: { $regex: q, $options: "i" },
        hashtags: { $all: htag },
    }

    if (fav === 'true') {
        query.fav = true;
    }

    let content = await db.collection("content");
    let total = await content.countDocuments(query);
    let totalpages = Math.ceil(total / 10);

    if (totalpages < 1) return res.status(204).json({
        status: 204,
        alert: "no entries found"
    });

    page = page > totalpages ? totalpages : page;
    page = page < 1 ? 1 : page;

    let entries = await content.find(query).sort({ date: sort === "latest" ? -1 : 1 }).skip((page - 1) * 10).limit(10).toArray();

    if (entries.length < 1) return res.status(204).json({
        status: 204,
        alert: "no entries found"
    });

    return res.status(200).json({
        status: 200,
        alert: "search successful",
        currentpage: page,
        totalpages: totalpages,
        result: entries
    });
}

let toggleFav = async (req, res, db) => {
    let { tk, id, fav } = req.body;
    let active = await db.collection("activeusers").findOne({ token: parseInt(tk) });
    if (!active) return res.status(401).json({ alert: "token expired" });
    await db.collection("content").updateOne(
        { _id: new ObjectId(id), username: active.username },
        { $set: { fav: fav === true || fav === "true" } }
    );
    return res.status(200).json({ status: 200 });
}

module.exports = { login, register, deleteAccount, logout, createEntry, updateEntry, deleteEntry, search, toggleFav };