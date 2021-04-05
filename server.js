const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));

// database connection
mongoose.connect(process.env.DB_URL, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    useCreateIndex: true,
});

// user model
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
});

const User = mongoose.model('User', userSchema);

// exercise model
const exerciseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }, 
  username: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  }, 
  date: {
    type: Date,
    required: true,
    
  }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);




// middleware will be used to check if the user exists before adding their exerices
const authenticate = async (req, res, next) => { 
  const userId = req.body.userId || req.query.userId;
  try {
    const found_user = await User.findById(userId); // check if the user exists in the database
    if(found_user){ 
      req.found_user = found_user;
      next(); // if found assign its value to the request object and procced with the authenticated user to post their execrise
    } else {
      res.send("failed to find user");
    }  
  } catch (e){ 
  } 
}

// middleware will be used to check if the username inputed is not taken 
const checkUsername = async (req, res, next) => {
  const username = req.body.username;
  try {
    const user = await User.findOne({username: username});
    if(user) {
      res.send("username already taken"); // if the username inputed already exists then just show this to user and don't procceed with saving user to the database
    } else {
      next(); // if the user is not found in the database then the user creation call will be completed
    }
  } catch (e) {
    res.json({message: "server error"});
  }
};



app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// create new user with a username
app.post("/api/exercise/new-user", checkUsername ,async (req, res) => {
  const username = req.body.username;
  const newUser = new User({
      username: username
    });
  
  try {
    await newUser.save();
    console.log("new user", newUser);
    res.json({message: "the following user has been added to database", user: newUser});

  } catch (e){
    res.json({error: "failed to add user"});
  }
});

// get all users in the database
app.get("/api/exercise/users", async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);

  } catch (e){
    res.json({message: "failed to get users from db"});
  }
})

// add an exerice of a current user
app.post("/api/exercise/add", authenticate, async (req, res) => {
  const exercise = new Exercise ({
    userId: req.found_user._id,
    username: req.found_user.username,
    description: req.body.description,
    duration: req.body.duration,
    date: new Date (req.body.date || Date.now())
  });
  // 
   console.log(exercise);
  try {
   const newExercise = await exercise.save();
    res.json(newExercise);


  } catch (e){
    res.send("failed to add exercise");
  }
  
});

// get all of the log exerices for a specific user in the database
app.get("/api/exercise/log", authenticate, async (req, res) => {
  try {
    if(req.query.from || req.query.to || req.query.limit){
     
      // route execution if query parameters are passsed will be used in querying and filtering data from the REST API
      const from = new Date(req.query.from || new Date('1971-01-01'));
      const to = new Date(req.query.to || Date.now());
      const limit = parseInt(req.query.limit);
      const user_exericses = await Exercise.find({userId: req.found_user._id, date: {$gte: from , $lte: to }}).limit(limit); // find all documents that meets specification of date range
      const count = user_exericses.length;
      res.send({user_exericses: user_exericses, count: count});
    } else {
      // default route function execution if no query parameters are passed will just return a log of all exercises made by the authenticated user
      const user_exericses = await Exercise.find({userId: req.found_user._id});
      const count = user_exericses.length;
      res.send({user_exericses: user_exericses, count: count});
    }
   
  } catch (e) {
    res.send("failed to get user's exercises");
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
