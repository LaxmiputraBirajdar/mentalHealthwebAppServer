const express = require("express");
const mongoose = require("mongoose");  // Fix the typo here
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const SECRET = "shpolanive";

// JWT Authentication
const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// User Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  name: { type: String },
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  testResults: [
    {
      testDate: { type: Date, default: Date.now },
      testScore: { type: Number },
      testResult: { type: String },
    }
  ],
});

// Defining the Mongoose Model
const User = mongoose.model('User', userSchema);



// Connecting backend to the MongoDB using mongoose
mongoose.connect("mongodb+srv://laxdeveloper:password15@cluster0.08v6sws.mongodb.net/WebappForMentalHealth");



// Check if the connection is successful
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => {
  console.log('Database connected successfully!');
});



// Routes
// Signup route
app.post('/signup', async (req, res) => {
  const { username, password, email, name, age, gender } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      res.status(403).json({ message: 'User already exists' });
    } else {
      const newUser = new User({
        username,
        password,
        email,
        name,
        age,
        gender,
      });
      await newUser.save();
      const token = jwt.sign({ username, role: 'user' }, SECRET, { expiresIn: '1h' });
      res.json({ message: 'User created successfully', token });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//Login Route 
app.post('/login', async (req, res) => {
  const { username, password } = req.body;  // Use req.body instead of req.headers
  try {
    const user = await User.findOne({ username, password });
    if (user) {
      const token = jwt.sign({ username, role: 'user' }, SECRET, { expiresIn: '1h' });
      res.json({ message: 'Logged in successfully', token });
    } else {
      res.status(403).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.get('/', (req, res) => {
  res.send('Hello, welcome to Web app for Mental Health Assessment This is the Home page');
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
