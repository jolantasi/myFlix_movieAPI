const http = require('http');
const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');

const { Movie, User } = require('./models');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('tiny'));

mongoose.connect('mongodb://127.0.0.1:27017/mongodb_data', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('🎬 Welcome to my Movie API!');
});

// 1. Get all movies
app.get('/movies', (req, res) => {
  Movie.find()
    .then(movies => res.status(200).json(movies))
    .catch(err => res.status(500).send('Error: ' + err));
});

// 2. Get movie by title
app.get('/movies/:title', (req, res) => {
  Movie.findOne({ title: new RegExp(req.params.title, 'i') })
    .then(movie => movie ? res.json(movie) : res.status(404).send('Movie not found'))
    .catch(err => res.status(500).send('Error: ' + err));
});

// 3. Get genre description by genre name
app.get('/genres/:genreName', (req, res) => {
  Movie.findOne({ 'genre.name': new RegExp('^' + req.params.genreName + '$', 'i') })
    .then(movie => {
      if (movie) {
        return res.json({
          genre: movie.genre.name,
          description: movie.genre.description,
        });
      }
      res.status(404).send('Genre not found');
    })
    .catch(err => res.status(500).send('Error: ' + err));
});

// 4. Get director info by director name
app.get('/directors/:directorName', (req, res) => {
  Movie.findOne({ 'director.name': new RegExp('^' + req.params.directorName + '$', 'i') })
    .then(movie => {
      if (movie) {
        return res.json(movie.director);
      }
      res.status(404).send('Director not found');
    })
    .catch(err => res.status(500).send('Error: ' + err));
});

// 5. Add a user
app.post('/users', (req, res) => {
  User.findOne({ username: req.body.username })
    .then(user => {
      if (user) return res.status(400).send(req.body.username + ' already exists');
      return User.create({
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        birthday: req.body.birthday,
      });
    })
    .then(newUser => res.status(201).json(newUser))
    .catch(err => res.status(500).send('Error: ' + err));
});

// 6. Update user info
app.put('/users/:username', (req, res) => {
  User.findOneAndUpdate(
    { username: req.params.username },
    {
      $set: {
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        birthday: req.body.birthday,
      },
    },
    { new: true }
  )
    .then(updatedUser => res.json(updatedUser))
    .catch(err => res.status(500).send('Error: ' + err));
});

// 7. Add movie to user’s favorites
app.post('/users/:username/movies/:MovieID', (req, res) => {
  User.findOneAndUpdate(
    { username: req.params.username },
    { $addToSet: { favoriteMovies: req.params.MovieID } },
    { new: true }
  )
    .then(updatedUser => res.json(updatedUser))
    .catch(err => res.status(500).send('Error: ' + err));
});

// 8. Remove movie from user’s favorites
app.delete('/users/:username/movies/:MovieID', (req, res) => {
  User.findOneAndUpdate(
    { username: req.params.username },
    { $pull: { favoriteMovies: req.params.MovieID } },
    { new: true }
  )
    .then(updatedUser => {
      if (!updatedUser) return res.status(404).send('User not found');
      res.json(updatedUser);
    })
    .catch(err => res.status(500).send('Error: ' + err));
});

// 9. Delete user by username
app.delete('/users/:username', async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ username: req.params.username });
    if (!deletedUser) {
      return res.status(404).send(`User '${req.params.username}' not found.`);
    }
    res.status(200).send(`User '${req.params.username}' deleted.`);
  } catch (err) {
    res.status(500).send('Error: ' + err);
  }
});

// 10. Get all users
app.get('/users', (req, res) => {
  User.find()
    .then(users => res.status(200).json(users))
    .catch(err => res.status(500).send('Error: ' + err));
});

// 11. Get single user by username
app.get('/users/:username', (req, res) => {
  User.findOne({ username: req.params.username })
    .then(user => user ? res.json(user) : res.status(404).send('User not found'))
    .catch(err => res.status(500).send('Error: ' + err));
});

// 12. Get movies by genre
app.get('/movies/genre/:genreName', (req, res) => {
  const genreName = req.params.genreName;

  Movie.find({ 'genre.name': new RegExp('^' + genreName + '$', 'i') })
    .then(movies => {
      if (movies.length === 0) {
        return res.status(404).json({ message: `No movies found in genre ${genreName}` });
      }
      res.json(movies);
    })
    .catch(err => res.status(500).send('Error: ' + err));
});

// 13. Get movies by director
app.get('/movies/director/:directorName', (req, res) => {
  const directorName = req.params.directorName;

  Movie.find({ 'director.name': new RegExp('^' + directorName + '$', 'i') })
    .then(movies => {
      if (movies.length === 0) {
        return res.status(404).json({ message: `No movies found for director ${directorName}` });
      }
      res.json(movies);
    })
    .catch(err => res.status(500).send('Error: ' + err));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong! 😓');
});

// Start server
http.createServer(app).listen(8080, () => {
  console.log('Server is running at http://localhost:8080');
});
