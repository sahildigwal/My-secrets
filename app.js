require ('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findOrCreate");
const saltRounds = 10;
const app = express();



console.log(process.env.API_KEY);
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyparser.urlencoded({
  extended: true
}));
app.use(session({
  secret:"Our little secret.",
  resave: false,
  saveUnintialized: true,
  cookie : {
            maxAge:(1000 * 60 * 100)
          }
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
const userSchema = new mongoose.Schema ({
  email:String,
  password:String,
  googleId:String,
  secret:String
});
userSchema.plugin(passportLocalMongose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get("/", function(req, res){
  res.render("home");
});
app.get("/auth/google",
  passport.authenticate('google', {scope: ["profile"]})
);
app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect("/secrets");
  });
app.get("/login", function(req, res){
  res.render("login");
});
app.get("/secrets", function(req,res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      cosole.log(err);
    } else {
      if (foundUsers){
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});
app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.resirect("/login");
  }
});
app.post("/submit", function(req, res){
  const submittedTheSecret = req.body.secret;
console.log(req.user.id);
User.findById(req.user.id, function(err, foundUser){
  if (err){
    console.log(err);
  } else {
    if (foundUser) {
      foundUser.secret = submittedTheSecret;
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
app.get("/register", function(req, res){
  res.render("register");
});
app.post("/register", function(req, res){
User.register({username:req.body.username},req.body.password, function(err,user){
  if (err){
    console.log(err);
    res.redirect("/register");
  } else {
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});
});
app.post("/login", function(req,res){
 const user = new User({
   username: req.body.username,
   password: req.body.password
 });
 req.login(user, function(err){
   if (err) {
     console.log(err);
   } else {
     passport.authenticate("local")(req, res, function(){
       res.redirect("/secrets");
     });
   }
 });
});
app.listen(3000, function(){
  console.log("server started on port 3000");
});
