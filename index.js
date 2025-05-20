const http = require('http');
const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');

const { Movie, User } = require('./models');

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files
app.use(morgan('tiny')); // Log HTTP requests

mongoose.connect('mongodb://localhost:27017/mongodb_data', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

// --- ROUTES ---

// Root
app.get('/', (req, res) => {
  res.send('🎬 Welcome to my Movie API!');
});

// 1. Get all movies
app.get('/movies', (req, res) => {
  Movie.find()
    .then((movies) => res.status(200).json(movies))
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 2. Get a movie by title
app.get('/movies/:title', (req, res) => {
  Movie.findOne({ Title: req.params.title })
    .then((movie) => {
      if (movie) return res.json(movie);
      res.status(404).send('Movie not found');
    })
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 3. Get genre description by genre name
app.get('/genres/:genreName', (req, res) => {
  Movie.findOne({ 'Genre.Name': new RegExp('^' + req.params.genreName + '$', 'i') })
    .then((movie) => {
      if (movie) {
        return res.json({
          Genre: movie.Genre.Name,
          Description: movie.Genre.Description,
        });
      }
      res.status(404).send('Genre not found');
    })
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 4. Get director info by director name
app.get('/directors/:directorName', (req, res) => {
  Movie.findOne({ 'Director.Name': new RegExp('^' + req.params.directorName + '$', 'i') })
    .then((movie) => {
      if (movie) return res.json(movie.Director);
      res.status(404).send('Director not found');
    })
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 5. Add a user
app.post('/users', (req, res) => {
  User.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) return res.status(400).send(req.body.Username + ' already exists');
      return User.create({
        Username: req.body.Username,
        Password: req.body.Password,
        Email: req.body.Email,
        Birthday: req.body.Birthday,
      });
    })
    .then((newUser) => res.status(201).json(newUser))
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 6. Update user info
app.put('/users/:Username', (req, res) => {
  User.findOneAndUpdate(
    { Username: req.params.Username },
    {
      $set: {
        Username: req.body.Username,
        Password: req.body.Password,
        Email: req.body.Email,
        Birthday: req.body.Birthday,
      },
    },
    { new: true }
  )
    .then((updatedUser) => res.json(updatedUser))
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 7. Add a movie to user's favorites
app.post('/users/:Username/movies/:MovieID', (req, res) => {
  User.findOneAndUpdate(
    { Username: req.params.Username },
    { $addToSet: { FavoriteMovies: req.params.MovieID } },
    { new: true }
  )
    .then((updatedUser) => res.json(updatedUser))
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 8. Remove a movie from user's favorites
app.delete('/users/:Username/movies/:MovieID', (req, res) => {
  User.findOneAndUpdate(
    { Username: req.params.Username },
    { $pull: { FavoriteMovies: req.params.MovieID } },
    { new: true }
  )
    .then((updatedUser) => {
      if (!updatedUser) return res.status(404).send('User not found');
      res.json(updatedUser);
    })
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 9. Delete a user by username
app.delete('/users/:Username', (req, res) => {
  User.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) return res.status(400).send(req.params.Username + ' was not found');
      res.status(200).send(req.params.Username + ' was deleted.');
    })
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 10. Get all users
app.get('/users', (req, res) => {
  User.find()
    .then((users) => res.status(200).json(users))
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 11. Get a single user by username
app.get('/users/:Username', (req, res) => {
  User.findOne({ Username: req.params.Username })
    .then((user) => {
      if (user) return res.json(user);
      res.status(404).send('User not found');
    })
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 12. Get Movies by Genre
app.get('/movies/genre/:genreName', (req, res) => {
  const genreName = req.params.genreName;

  Movie.find({ 'Genre.Name': new RegExp('^' + genreName + '$', 'i') })
    .then((movies) => {
      if (movies.length === 0) {
        return res.status(404).json({ message: `No movies found in genre ${genreName}` });
      }
      res.json(movies);
    })
    .catch((err) => res.status(500).send('Error: ' + err));
});

// 13. Get Movies by Director
app.get('/movies/director/:directorName', (req, res) => {
  const directorName = req.params.directorName;

  Movie.find({ 'Director.Name': new RegExp('^' + directorName + '$', 'i') })
    .then((movies) => {
      if (movies.length === 0) {
        return res.status(404).json({ message: `No movies found for director ${directorName}` });
      }
      res.json(movies);
    })
    .catch((err) => res.status(500).send('Error: ' + err));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong! 😓');
});

// Start server
http.createServer(app).listen(8080, () => {
  console.log('Server is running at http://localhost:8080');
});
