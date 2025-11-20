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

/**
 * @file index.js
 * @description Main entry point for the myFlix API. Sets up Express, middleware, database connection,
 * and all core routes for movies and users.
 * @requires express
 * @requires mongoose
 * @requires passport
 * @requires module:./models
 * @requires module:./auth
 * @requires module:./passport
 */

// Initialize passport strategies BEFORE using routes
require('./passport'); // Local and JWT strategies

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('tiny'));
app.use(passport.initialize()); // ✅ Must be after express.json but before any protected routes

// Allow all origins temporarily (for development only)
app.use(
  cors({
    origin: [
      'http://localhost:1234',
      'http://localhost:4200',
      'https://myflixy.netlify.app',
      'https://jolantasi.github.io'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);

// Import models
const { Movie, User } = require('./models');

// Setup auth routes
const authRouter = require('./auth')(express.Router());
app.use('/', authRouter);

/**
 * Connects to MongoDB using the connection URI defined in the environment variables.
 * @function
 * @name connectToDatabase
 */
mongoose
  .connect(process.env.CONNECTION_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- ROUTES ---

/**
 * Root endpoint providing a simple welcome message.
 * @name GetRoot
 * @route GET /
 * @group General
 * @returns {string} 200 - Welcome message
 */
app.get('/', (req, res) => {
  res.send('🎬 Welcome to my Movie API!');
});

/**
 * Get a list of all movies.
 * This endpoint is protected by JWT authentication.
 *
 * @name GetAllMovies
 * @route GET /movies
 * @group Movies
 * @security JWT
 * @returns {Array.<Movie>} 200 - An array of movie objects
 * @returns {Error} 500 - Internal server error
 */
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

/**
 * Get a single movie by title.
 * Case-insensitive search on the movie title.
 * Protected by JWT authentication.
 *
 * @name GetMovieByTitle
 * @route GET /movies/:title
 * @group Movies
 * @security JWT
 * @param {string} title.path.required - Movie title (case-insensitive)
 * @returns {Movie} 200 - Movie object
 * @returns {string} 404 - Movie not found
 * @returns {Error} 500 - Internal server error
 */
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

/**
 * Get a genre description by its name.
 * Returns the genre name and description from the first matching movie.
 * Protected by JWT authentication.
 *
 * @name GetGenreByName
 * @route GET /genres/:genreName
 * @group Genres
 * @security JWT
 * @param {string} genreName.path.required - Genre name (case-insensitive)
 * @returns {Object} 200 - Genre data
 * @returns {string} 200.genre - Genre name
 * @returns {string} 200.description - Genre description
 * @returns {string} 404 - Genre not found
 * @returns {Error} 500 - Internal server error
 */
app.get('/genres/:genreName', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const movie = await Movie.findOne({
      'genre.name': new RegExp('^' + req.params.genreName + '$', 'i')
    });

    if (movie) {
      return res.status(200).json({
        genre: movie.genre.name,
        description: movie.genre.description
      });
    }

    res.status(404).send('Genre not found');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});

/**
 * Get director details by director name.
 * Returns the director subdocument from the first matching movie.
 * Protected by JWT authentication.
 *
 * @name GetDirectorByName
 * @route GET /directors/:directorName
 * @group Directors
 * @security JWT
 * @param {string} directorName.path.required - Director name (case-insensitive)
 * @returns {Object} 200 - Director object
 * @returns {string} 404 - Director not found
 * @returns {Error} 500 - Internal server error
 */
app.get(
  '/directors/:directorName',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const movie = await Movie.findOne({
        'director.name': new RegExp('^' + req.params.directorName + '$', 'i')
      });

      if (movie) {
        return res.status(200).json(movie.director);
      }

      res.status(404).send('Director not found');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    }
  }
);

/**
 * Register a new user.
 * Validates the request body and hashes the password before creating the user.
 *
 * @name RegisterUser
 * @route POST /users
 * @group Users
 * @param {string} body.username.required - Username (min 5, alphanumeric)
 * @param {string} body.password.required - Plain text password
 * @param {string} body.email.required - Valid email address
 * @param {string} body.Birthday - User birthday (ISO date string)
 * @returns {User} 201 - Newly created user
 * @returns {Object} 422 - Validation errors
 * @returns {string} 400 - Username already exists
 * @returns {Error} 500 - Internal server error
 */
app.post(
  '/users',
  [
    check('username', 'Username is required and must be at least 5 characters long').isLength({
      min: 5
    }),
    check('username', 'Username must contain only alphanumeric characters').isAlphanumeric(),
    check('password', 'Password is required').not().isEmpty(),
    check('email', 'Email does not appear to be valid').isEmail()
  ],
  async (req, res) => {
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
  }
);

/**
 * Update an existing user's data.
 * Only the authenticated user can update their own account.
 * Fields are validated and the password is re-hashed if changed.
 *
 * @name UpdateUser
 * @route PUT /users/:username
 * @group Users
 * @security JWT
 * @param {string} username.path.required - Current username of the user
 * @param {string} [body.username] - New username (optional)
 * @param {string} [body.password] - New password (optional, will be hashed)
 * @param {string} [body.email] - New email address (optional)
 * @param {string} [body.Birthday] - New birthday (optional)
 * @returns {User} 200 - Updated user object
 * @returns {Object} 422 - Validation errors
 * @returns {string} 400 - Permission denied
 * @returns {Error} 500 - Internal server error
 */
app.put(
  '/users/:username',
  [
    passport.authenticate('jwt', { session: false }),
    check('username', 'Username must be at least 5 characters long')
      .optional()
      .isLength({ min: 5 }),
    check('username', 'Username must be alphanumeric').optional().isAlphanumeric(),
    check('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    check('email', 'Email does not appear to be valid').optional().isEmail()
  ],
  async (req, res) => {
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
  }
);

/**
 * Add a movie to a user's list of favorite movies.
 * Only the authenticated user can modify their own favorites.
 *
 * @name AddFavoriteMovie
 * @route POST /users/:username/movies/:MovieID
 * @group Users
 * @security JWT
 * @param {string} username.path.required - Username of the user
 * @param {string} MovieID.path.required - ID of the movie to add
 * @returns {User} 200 - Updated user object with new favorite movie
 * @returns {string} 403 - Permission denied
 * @returns {string} 404 - User not found
 * @returns {Error} 500 - Internal server error
 */
app.post(
  '/users/:username/movies/:MovieID',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
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
  }
);

/**
 * Remove a movie from a user's list of favorite movies.
 * Only the authenticated user can modify their own favorites.
 *
 * @name RemoveFavoriteMovie
 * @route DELETE /users/:username/movies/:MovieID
 * @group Users
 * @security JWT
 * @param {string} username.path.required - Username of the user
 * @param {string} MovieID.path.required - ID of the movie to remove
 * @returns {User} 200 - Updated user object without the removed movie
 * @returns {string} 403 - Permission denied
 * @returns {string} 404 - User not found
 * @returns {Error} 500 - Internal server error
 */
app.delete(
  '/users/:username/movies/:MovieID',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
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
  }
);

/**
 * Deregister (delete) an existing user.
 * Only the authenticated user can delete their own account.
 *
 * @name DeleteUser
 * @route DELETE /users/:username
 * @group Users
 * @security JWT
 * @param {string} username.path.required - Username of the user to delete
 * @returns {string} 200 - Confirmation message
 * @returns {string} 403 - Permission denied
 * @returns {string} 404 - User not found
 * @returns {Error} 500 - Internal server error
 */
app.delete(
  '/users/:username',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
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
  }
);

/**
 * Get a single user by username.
 * Only the authenticated user can access their own user document.
 *
 * @name GetUserByUsername
 * @route GET /users/:username
 * @group Users
 * @security JWT
 * @param {string} username.path.required - Username of the user
 * @returns {User} 200 - User object
 * @returns {string} 403 - Access denied
 * @returns {string} 404 - User not found
 * @returns {Error} 500 - Internal server error
 */
app.get(
  '/users/:username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    // Only allow users to get their own data
    if (req.user.username !== req.params.username) {
      return res.status(403).send('Access denied.');
    }

    User.findOne({ username: req.params.username })
      .then((user) => {
        if (!user) return res.status(404).send('User not found');
        res.json(user);
      })
      .catch((err) => res.status(500).send('Error: ' + err));
  }
);

/**
 * Get all movies that belong to a specific genre.
 * Protected by JWT authentication.
 *
 * @name GetMoviesByGenre
 * @route GET /movies/genre/:genreName
 * @group Movies
 * @security JWT
 * @param {string} genreName.path.required - Genre name (case-insensitive)
 * @returns {Array.<Movie>} 200 - List of movies matching the genre
 * @returns {Object} 404 - Message that no movies were found
 * @returns {Error} 500 - Internal server error
 */
app.get(
  '/movies/genre/:genreName',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const genreName = req.params.genreName;

    Movie.find({ 'genre.name': new RegExp('^' + genreName + '$', 'i') })
      .then((movies) => {
        if (movies.length === 0) {
          return res
            .status(404)
            .json({ message: `No movies found in genre '${genreName}'` });
        }
        res.json(movies);
      })
      .catch((err) => res.status(500).send('Error: ' + err));
  }
);

/**
 * Get all movies by a specific director.
 * Protected by JWT authentication.
 *
 * @name GetMoviesByDirector
 * @route GET /movies/director/:directorName
 * @group Movies
 * @security JWT
 * @param {string} directorName.path.required - Director name (case-insensitive)
 * @returns {Array.<Movie>} 200 - List of movies by the given director
 * @returns {Object} 404 - Message that no movies were found
 * @returns {Error} 500 - Internal server error
 */
app.get(
  '/movies/director/:directorName',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const directorName = req.params.directorName;

    try {
      const movies = await Movie.find({
        'director.name': new RegExp('^' + directorName + '$', 'i')
      });

      if (movies.length === 0) {
        return res
          .status(404)
          .json({ message: `No movies found for director '${directorName}'` });
      }

      res.json(movies);
    } catch (err) {
      res.status(500).send('Error: ' + err.message);
    }
  }
);

/**
 * Generic error-handling middleware.
 * Sends a 500 status code for unhandled server errors.
 *
 * @name ErrorHandler
 * @function
 * @param {Error} err - Error object
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next middleware function
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong! 😓');
});

/**
 * Starts the HTTP server on the configured port.
 * @function
 * @name startServer
 * @param {number} port - Port number to listen on
 */
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});
