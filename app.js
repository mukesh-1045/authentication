//jshint esversion:6
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const encrypt = require("mongoose-encryption");


const app = express();


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);


app.get("/", (req, res) => {
    res.render("home");
});


app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    User.findOne({ email: username }, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            if (data) {
                if (data.password === password) {
                    res.render("secrets");
                } else {
                    res.send("<h1>Sorry wrong password try again go back</h1>");
                }
            } else {
                res.send("<h1>Sorry wrong Username try again or create one</h1>");
            }
        }
    });
});


app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save((err) => {
        if (!err) {
            res.render("secrets");
        } else {
            console.log(err);
        }
    });
});


app.listen(3000, () => {
    console.log("listining................");
});