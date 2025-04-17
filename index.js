const http = require('http');
const express = require('express');
const app = express();
const morgan = require('morgan');

// Middleware to serve static files
app.use(express.static('public'));

// Middleware to log requests
app.use(morgan('tiny'));

// Sample movie data
const topMovies = [
  { title: "Inception", year: 2010 },
  { title: "The Matrix", year: 1999 },
  { title: "Interstellar", year: 2014 },
  { title: "The Lord of the Rings", year: 2001 },
  { title: "Pulp Fiction", year: 1994 },
  { title: "The Dark Knight", year: 2008 },
  { title: "Forrest Gump", year: 1994 },
  { title: "Fight Club", year: 1999 },
  { title: "The Godfather", year: 1972 },
  { title: "Spirited Away", year: 2001 }
];

// Routes
app.get('/', (req, res) => {
  res.send('🎬 Welcome to my Movie API!');
});

app.get('/movies', (req, res) => {
  res.json(topMovies);
});

app.get('/error-test', (req, res) => {
  throw new Error('🚨 Test error!');
});

// ✅ Error-handling middleware (must be last!)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong! 😓');
});

// Start the server
http.createServer(app).listen(8080, () => {
  console.log('Server is running at http://localhost:8080');
});