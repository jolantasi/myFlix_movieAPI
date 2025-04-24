const http = require('http');
const express = require('express');
const app = express();
const morgan = require('morgan');

app.use(express.json()); // Parse JSON bodies
app.use(express.static('public')); // Serve static files
app.use(morgan('tiny')); // Log HTTP requests

// In-memory movie data
const movies = [
  {
    title: "Inception",
    description: "A thief enters people’s dreams to steal secrets.",
    genre: { name: "Sci-Fi", description: "Science fiction with futuristic elements" },
    director: { name: "Christopher Nolan", bio: "British-American filmmaker", birthYear: 1970 },
    imageUrl: "/images/inception.jpg",
    featured: true
  },
  {
    title: "The Matrix",
    description: "A hacker discovers reality is a simulation.",
    genre: { name: "Action", description: "High-paced action with sci-fi themes" },
    director: { name: "Lana Wachowski", bio: "American director and writer", birthYear: 1965 },
    imageUrl: "/images/matrix.jpg",
    featured: true
  },
  {
    title: "Pulp Fiction",
    description: "Crime stories interwoven in Los Angeles.",
    genre: { name: "Crime", description: "Crime and drama with nonlinear storytelling" },
    director: { name: "Quentin Tarantino", bio: "American filmmaker known for stylized violence", birthYear: 1963 },
    imageUrl: "/images/pulpfiction.jpg",
    featured: false
  },
  {
    title: "The Godfather",
    description: "The story of a powerful mafia family.",
    genre: { name: "Drama", description: "Classic crime drama about power and family" },
    director: { name: "Francis Ford Coppola", bio: "American film director", birthYear: 1939 },
    imageUrl: "/images/godfather.jpg",
    featured: true
  },
  {
    title: "Spirited Away",
    description: "A young girl enters a magical world of spirits.",
    genre: { name: "Fantasy", description: "Japanese animated fantasy adventure" },
    director: { name: "Hayao Miyazaki", bio: "Famous Japanese animator and director", birthYear: 1941 },
    imageUrl: "/images/spiritedaway.jpg",
    featured: false
  }
];


// In-memory user data (for example purposes)
let users = [
  { username: "john_doe", favorites: ["Inception"] }
];

// --- ROUTES ---

// Root
app.get('/', (req, res) => {
  res.send('🎬 Welcome to my Movie API!');
});

// Return a list of ALL movies to the user
app.get('/movies', (req, res) => {
  res.json(movies);
});

// Return ONE movie by title
app.get('/movies/:title', (req, res) => {
  const movie = movies.find(m => m.title.toLowerCase() === req.params.title.toLowerCase());
  if (movie) {
    res.json(movie);
  } else {
    res.status(404).send('Movie not found');
  }
});

// Genre description by name
app.get('/genres/:genreName', (req, res) => {
  const movie = movies.find(m => m.genre.name.toLowerCase() === req.params.genreName.toLowerCase());
  if (movie) return res.json({ genre: movie.genre.name, description: movie.genre.description });
  res.status(404).send('Genre not found');
});

// Director info by name
app.get('/directors/:directorName', (req, res) => {
  const movie = movies.find(m => m.director.name.toLowerCase() === req.params.directorName.toLowerCase());
  if (movie) return res.json(movie.director);
  res.status(404).send('Director not found');
});

// Register user
app.post('/users', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).send('Username is required');
  if (users.find(u => u.username === username)) return res.status(400).send('User already exists');
  users.push({ username, favorites: [] });
  res.send(`User ${username} registered successfully`);
});

// Update username
app.put('/users/:username', (req, res) => {
  const user = users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).send('User not found');
  user.username = req.body.username || user.username;
  res.send(`User updated to ${user.username}`);
});

// Add favorite movie
app.post('/users/:username/movies/:movieTitle', (req, res) => {
  const user = users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).send('User not found');
  if (!user.favorites.includes(req.params.movieTitle)) {
    user.favorites.push(req.params.movieTitle);
  }
  res.send(`Movie "${req.params.movieTitle}" added to favorites`);
});

// Remove a movie from their list of favorites
app.delete('/users/:username/movies/:movieTitle', (req, res) => {
  const user = users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).send('User not found');
  user.favorites = user.favorites.filter(title => title !== req.params.movieTitle);
  res.send(`Movie "${req.params.movieTitle}" removed from favorites`);
});

// Allow existing users to deregister (delete user)
app.delete('/users/:username', (req, res) => {
  users = users.filter(u => u.username !== req.params.username);
  res.send(`User ${req.params.username} has been deregistered`);
});

// Error-handling middleware (keep last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong! 😓');
});

// Start server
http.createServer(app).listen(8080, () => {
  console.log('Server is running at http://localhost:8080');
});

