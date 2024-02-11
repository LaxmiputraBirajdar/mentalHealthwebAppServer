const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require('body-parser'); // Added bodyParser
const app = express();



// ... (your schema definitions)

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
      testResult: { },
    }
  ],
});

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
});

const toolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  questions: [
    {
      text: { type: String, required: true },
    }
  ],
});





// Models 

const User = mongoose.model('User', userSchema);
const Question = mongoose.model('Question', questionSchema);
const Tool = mongoose.model('Tool', toolSchema);


app.use(cors());
app.use(express.json());
// app.use(bodyParser.json());







const SECRET = "shpolanive";

// JWT Authentication
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
      console.log(req.user); // Add this line to log user information
      next();
    });
  } else {
    res.sendStatus(401);
  }
};








// Connecting backend to the MongoDB using mongoose
mongoose.connect("mongodb+srv://laxdeveloper:password15@cluster0.08v6sws.mongodb.net/WebappForMentalHealth");

// Check if the connection is successful
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => {
  console.log('Database connected successfully!');
});

// User routes
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

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (user) {
      const token = jwt.sign({ _id: user._id, username, role: 'user' }, SECRET, { expiresIn: '1h' });
      res.json({ message: 'Logged in successfully', token });
    } else {
      res.status(403).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Tools routes
const router = express.Router(); // Added router definition

router.get('/:toolName/questions', async (req, res) => {
  try {
    const toolName = req.params.toolName;
    const tool = await Tool.findOne({ name: toolName }).populate('questions');
    
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }
    
    res.json(tool.questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/:toolName/submit', authenticateJwt, async (req, res) => {
  try {
    const toolName = req.params.toolName; // Change parameter name to toolName
    const answers = req.body;
    console.log(answers);
    // const answersArray = req.body;

    // Validate input
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid answers format' });
    }

    // Fetch the tool using the name to get the list of questions
    const tool = await Tool.findOne({ name: toolName }).populate('questions'); // Change to findOne with name
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    // Ensure the number of answers matches the number of questions
    if (answers.length !== tool.questions.length) {
      return res.status(400).json({ error: 'Mismatch between questions and answers' });
    }

    // Process and store answers
    const results = [];
    let totalScore = 0; // Initialize the total score

    for (let i = 0; i < tool.questions.length; i++) {
      const question = tool.questions[i];
      const answer = answers[i];

      // Process the answer as needed
      results.push({
        questionText: question.text,
        answer: answer,
      });

      // Add the answer to the total score
      totalScore += answer;
    }

    // Determine the result based on the total score
    let result;
    if (totalScore >= 1 && totalScore <= 4) {
      result = 'Minimal depression';
    } else if (totalScore >= 5 && totalScore <= 9) {
      result = 'Mild depression';
    } else if (totalScore >= 10 && totalScore <= 14) {
      result = 'Moderate depression';
    } else if (totalScore >= 15 && totalScore <= 19) {
      result = 'Moderately severe depression';
    } else {
      result = 'Severe depression';
    }

    // Update the user's testResults array in the database
    const userId = req.user._id; // Assuming you have user data in req.user after authentication
    await User.findByIdAndUpdate(userId, {
      $push: {
        testResults: {
          testDate: new Date(),
          testScore: totalScore, // Use totalScore directly as it's already a number
          testResult: result,
        },
      },
    });

    // Return the response
    // Return the response
    const response = {
      message: 'Assessment completed successfully',
      results,
      totalScore,
      result,
    };
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Insert a new tool
// Insert a new tool with questions
router.post('/insert', async (req, res) => {

  console.log(req.body);
  try {
    const { name, questions } = req.body;

    // Validate input
    if (!name || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    // Create a new tool
    const newTool = new Tool({
      name,
      questions: questions.map(text => ({ text })),
    });

    // Save the tool to the database
    await newTool.save();

    res.json({ message: 'Tool inserted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
;

// Mount the router for tools
app.use('/tools', router);

app.get('/', (req, res) => {
  res.send('Hello, welcome to Web app for Mental Health Assessment. This is the Home page.');
});


const port = 3001;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
