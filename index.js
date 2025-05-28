const http = require('http');
const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');

const { Movie, User } = require('./models');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(morgan('tiny'));

mongoose.connect('mongodb://127.0.0.1:27017/mongodb_data', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let auth = require('./auth')(app);

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('🎬 Welcome to my Movie API!');
});

// 1. Get all movies
app.get('/movies', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movie.find()
    .then((movies) => {
      res.status(201).json(movies);
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
app.post('/users', (req, res) => {
  User.findOne({ username: req.body.username })
    .then(user => {
      if (user) return res.status(400).send(req.body.username + ' already exists');
      return User.create({
        username: req.body.username,
        password: User.hashPassword(req.body.password),
        email: req.body.email,
        Birthday: req.body.Birthday,
      });
    })
    .then(newUser => res.status(201).json(newUser))
    .catch(err => res.status(500).send('Error: ' + err));
});

// 6. Update user info
app.put('/users/:username', passport.authenticate('jwt', { session: false }), async (req, res) => {
    // CONDITION TO CHECK ADDED HERE
    if(req.user.username !== req.params.username){
        return res.status(400).send('Permission denied');
    }
    // CONDITION ENDS
    await User.findOneAndUpdate({ username: req.params.Username }, {
        $set:
        {
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            Birthday: req.body.Birthday
        }
    },
        { new: true }) // This line makes sure that the updated document is returned
        .then((updatedUser) => {
            res.json(updatedUser);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send('Error: ' + err);
        })
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
http.createServer(app).listen(8080, () => {
  console.log('Server is running at http://localhost:8080');
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Movie API is listening on port ${port}`);
});
