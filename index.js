require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
const http = require('http');
const morgan = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const { check, validationResult } = require('express-validator');

// Initialize passport strategies BEFORE using routes
require('./passport'); // Local and JWT strategies

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('tiny'));
app.use(passport.initialize()); // ✅ Must be after express.json but before any protected routes
// Allow all origins temporarily (for development only)
app.use(cors({
  origin: "http://localhost:1234",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Import models
const { Movie, User } = require('./models');

// Setup auth routes
const authRouter = require('./auth')(express.Router());
app.use('/', authRouter);

mongoose.connect(process.env.CONNECTION_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('🎬 Welcome to my Movie API!');
});

// 1. Get all movies (JWT protected)
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movie.find()
    .then((movies) => {
      res.status(200).json(movies);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

// 2. Get movie by title
app.get('/movies/:title', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const movie = await Movie.findOne({ title: new RegExp(req.params.title, 'i') });
    
    if (movie) {
      res.status(200).json(movie);
    } else {
      res.status(404).send('Movie not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});


// 3. Get genre description by genre name
app.get('/genres/:genreName', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const movie = await Movie.findOne({ 'genre.name': new RegExp('^' + req.params.genreName + '$', 'i') });

    if (movie) {
      return res.status(200).json({
        genre: movie.genre.name,
        description: movie.genre.description,
      });
    }

    res.status(404).send('Genre not found');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});

// 4. Get director info by director name
app.get('/directors/:directorName', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const movie = await Movie.findOne({ 'director.name': new RegExp('^' + req.params.directorName + '$', 'i') });

    if (movie) {
      return res.status(200).json(movie.director);
    }

    res.status(404).send('Director not found');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});

// 5. Add a user (registration)
app.post('/users', [
  check('username', 'Username is required and must be at least 5 characters long')
    .isLength({ min: 5 }),
  check('username', 'Username must contain only alphanumeric characters')
    .isAlphanumeric(),
  check('password', 'Password is required').not().isEmpty(),
  check('email', 'Email does not appear to be valid')
    .isEmail()
], async (req, res) => {
  // Check the validation result
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const hashedPassword = bcrypt.hashSync(req.body.password, 10);

  try {
    const user = await User.findOne({ username: req.body.username });
    if (user) {
      return res.status(400).send(req.body.username + ' already exists');
    }

    const newUser = await User.create({
      username: req.body.username,
      password: hashedPassword,
      email: req.body.email,
      Birthday: req.body.Birthday
    });

    return res.status(201).json(newUser);
  } catch (err) {
    return res.status(500).send('Error: ' + err);
  }
});

// 6. Update user
app.put('/users/:username', [
  passport.authenticate('jwt', { session: false }),
  check('username', 'Username must be at least 5 characters long').optional().isLength({ min: 5 }),
  check('username', 'Username must be alphanumeric').optional().isAlphanumeric(),
  check('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),  
  check('email', 'Email does not appear to be valid').optional().isEmail()
], async (req, res) => {
  // Check if the user is authorized
  if (req.user.username !== req.params.username) {
    return res.status(400).send('Permission denied');
  }

  // Handle validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  // Hash the new password if provided
  let updateFields = {
    username: req.body.username,
    email: req.body.email,
    Birthday: req.body.Birthday
  };

  if (req.body.password) {
    updateFields.password = bcrypt.hashSync(req.body.password, 10);
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: updateFields },
      { new: true }
    );
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});

// 7. Add movie to user’s favorites
app.post('/users/:username/movies/:MovieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
  // Check if the authenticated user matches the username in the route
  if (req.user.username !== req.params.username) {
    return res.status(403).send('Permission denied');
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { username: req.params.username },
      { $addToSet: { favoriteMovies: req.params.MovieID } }, // $addToSet avoids duplicates
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});

// 8. Remove movie from user’s favorites
app.delete('/users/:username/movies/:MovieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
  // Only allow users to remove movies from their own favorites
  if (req.user.username !== req.params.username) {
    return res.status(403).send('Permission denied');
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { username: req.params.username },
      { $pull: { favoriteMovies: req.params.MovieID } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});

// 9. Allow existing users to deregister (delete user)
app.delete('/users/:username', passport.authenticate('jwt', { session: false }), async (req, res) => {
  // Only allow users to delete their own account
  if (req.user.username !== req.params.username) {
    return res.status(403).send('Permission denied');
  }

  try {
    const deletedUser = await User.findOneAndDelete({ username: req.params.username });

    if (!deletedUser) {
      return res.status(404).send(`User '${req.params.username}' not found.`);
    }

    res.status(200).send(`User '${req.params.username}' deleted.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});

// 11. Get single user by username (secured)
app.get('/users/:username', passport.authenticate('jwt', { session: false }), (req, res) => {
  // Only allow users to get their own data
  if (req.user.username !== req.params.username) {
    return res.status(403).send('Access denied.');
  }

  User.findOne({ username: req.params.username })
    .then(user => {
      if (!user) return res.status(404).send('User not found');
      res.json(user);
    })
    .catch(err => res.status(500).send('Error: ' + err));
});


// 12. Get movies by genre (secured with JWT)
app.get('/movies/genre/:genreName', passport.authenticate('jwt', { session: false }), (req, res) => {
  const genreName = req.params.genreName;

  Movie.find({ 'genre.name': new RegExp('^' + genreName + '$', 'i') })
    .then(movies => {
      if (movies.length === 0) {
        return res.status(404).json({ message: `No movies found in genre '${genreName}'` });
      }
      res.json(movies);
    })
    .catch(err => res.status(500).send('Error: ' + err));
});

// 13. Get movies by director (secured with JWT)
app.get('/movies/director/:directorName', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const directorName = req.params.directorName;

  try {
    const movies = await Movie.find({ 'director.name': new RegExp('^' + directorName + '$', 'i') });

    if (movies.length === 0) {
      return res.status(404).json({ message: `No movies found for director '${directorName}'` });
    }

    res.json(movies);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong! 😓');
});

// Start server
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});
