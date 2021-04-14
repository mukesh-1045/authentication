//jshint esversion:6
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const encrypt = require("mongoose-encryption"); as changes to MD%
// const md5 = require("md5"); because modified to bcrypt
// const bcrypt = require("bcrypt"); used for bcrypt


const app = express();
// const saltRounds = 10;  bcrypt


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "Our fucking secret dont fuck.",
    resave: false,
    saveUninitialized: true,
    // cookie : {secure : }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    googleId: String,
    email: String,
    password: String,
    secret: String
});


// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] }); as changes to MD5
userSchema.plugin(passportLocalMongoose); // adding schema plugin
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

//code for serialise and deserialise
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());   goof for only local
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) { // goof for all type
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});



passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(token, tokenSecret, profile, done) {
        User.findOrCreate({ googleId: profile.id }, function(err, user) {
            return done(err, user);
        });
    }
));


app.get("/", (req, res) => {
    res.render("home");
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
        res.redirect("/secrets");
    });


app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err) => {
        if (err) {
            console.log(err);
            res.redirect("/login");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });

        }
    });


    // all brlow used for bcrypt and older version
    // let username = req.body.username;
    // let password = req.body.password;

    // User.findOne({ email: username }, (err, data) => {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         if (data) {
    //             // if (data.password === password) {substitued with bcrypt meth9d
    //             bcrypt.compare(password, data.password, function(err, result) {
    //                 // result == true
    //                 if (result === true) {
    //                     res.render("secrets");
    //                 } else {
    //                     res.send("<h1>Sorry wrong password try again go back</h1>");
    //                 }
    //             });

    //             // } 

    //         } else {
    //             res.send("<h1>Sorry wrong Username try again or create one</h1>");
    //         }
    //     }
    // });
});

app.get("/secrets", (req, res) => {
    // if (req.isAuthenticated()) {
    //     res.render("secrets");
    // } else {
    //     res.redirect("/login");
    // }    for submit 

    User.find({ "secret": { $ne: null } }, (err, foundUsers) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", { usersWithSecrets: foundUsers });
            }
        }
    });
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {

    User.register({ username: req.body.username }, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            })

        }
    });



    // all below for bcrypt
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     // Store hash in your password DB.
    //     const newUser = new User({ // from out gets came in
    //         email: req.body.username,
    //         password: hash
    //     });
    //     newUser.save((err) => {
    //         if (!err) {
    //             res.render("secrets");
    //         } else {
    //             console.log(err);
    //         }
    //     });
    // });


});


app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});


app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(() => {
                    res.redirect("/secrets");
                });

            }
        }
    });
});


app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});

app.listen(3000, () => {
    console.log("listining................");
});