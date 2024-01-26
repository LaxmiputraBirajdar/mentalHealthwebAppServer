const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.send('Hello , Wel come to Web app for Mental Health Assessment');
});


const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
