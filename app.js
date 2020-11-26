require('dotenv').config();//ORDER OF CODE IS VERY IMP FOR WORKING PROPERLY.
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption"); no longer we need this bcoz not that much strong to protect the password.
// const md5 = require("md5"); nw we are not using md5 and instad of md5 we gonna use bcrypt for salting.
// const bcrypt = require("bcrypt");
// const saltRounds = 10; 
//Now we will use the bcrypt through passport for authentication too.
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { Passport } = require('passport');
//OAuth 2.0 == for google authentication
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app= express();

// console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret: "My little secret.",
    resave: false,
    saveUninitialized: false
}));//use session documentation.

app.use(passport.initialize());
app.use(passport.session());//use passport documentation

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true, useUnifiedTopology:true});
mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields:["password"]}); removed bcoz related to mongoose encryption and no longer w eneed that.
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

//google auth 
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect("/secrets");
  });

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }else{
    //     res.redirect("/login");
    // }

    User.find({"secret":{$ne: null}}, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                res.render("secrets", {usersWithSecrets : foundUser});
            }
        }
    });
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit", function(req,res){
    const submittedSecret = req.body.secret;

    // console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });
});
    
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

app.post("/register", function(req, res){

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash){

    //     const newUser = new User({
    //         email: req.body.username,
    //         password:hash
    //     });
    
    //     newUser.save(function (err) {
    //         if(err) {
    //             console.log(err);
    //         }
    //         else{
    //             res.render("secrets");
    //         } 
    //     });
    // });
    //USING PASSPORT----->
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }

    });
});

app.post("/login", function (req , res) {
    // const username = req.body.username;
    // const password = req.body.password;
    
    // User.findOne({email: username}, function(err, foundUser){
    //     if(err){
    //         console.log(err);
    //     }else{
    //         if(foundUser){
    //            bcrypt.compare(password, foundUser.password, function(err, result){
    //                if(result==true){
    //                 res.render("secrets");
    //                }
    //            });
                
    //         }
    //     }
    // });
    //USING PASSPORT--->
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });

});











app.listen(3000, function(){
    console.log("Server started on port 3000.")
});
