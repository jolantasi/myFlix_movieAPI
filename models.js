const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * @file models.js
 * @description Mongoose data models for the myFlix API, including Movie and User schemas.
 * Defines data structures used throughout the database.
 */

/**
 * Movie schema defining movie details, genre, director, and associated properties.
 *
 * @typedef Movie
 * @property {string} title.required - Movie title
 * @property {string} description.required - Movie description
 * @property {Object} genre - Genre information
 * @property {string} genre.name - Genre name
 * @property {string} genre.description - Genre description
 * @property {Object} director - Director information
 * @property {string} director.name - Director name
 * @property {string} director.bio - Director biography
 * @property {Array.<string>} actors - List of actors appearing in the movie
 * @property {string} imageUrl - URL to movie poster image
 * @property {boolean} isFeatured - Whether the movie is featured
 */
const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  genre: {
    name: String,
    description: String,
  },
  director: {
    name: String,
    bio: String,
  },
  actors: [String],
  imageUrl: String,
  isFeatured: Boolean,
});

/**
 * User schema defining user account information and stored favorite movies.
 *
 * @typedef User
 * @property {string} username.required - Unique username
 * @property {string} password.required - Hashed user password
 * @property {string} email.required - User email address
 * @property {Date} Birthday - User birthday
 * @property {Array.<Movie>} favoriteMovies - List of user's favorite movies (ObjectId references)
 */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  Birthday: Date,
  favoriteMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
});

/**
 * Hash a password before saving a user.
 *
 * @function
 * @name hashPassword
 * @memberof User
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
userSchema.statics.hashPassword = function (password) {
  return bcrypt.hashSync(password, 10);
};

/**
 * Validate a user's password by comparing it to the stored hash.
 *
 * @function
 * @name validatePassword
 * @memberof User
 * @instance
 * @param {string} password - Plain text password
 * @returns {Promise<boolean>} Whether the password is valid
 */
userSchema.methods.validatePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// Create models
const Movie = mongoose.model('Movie', movieSchema);
const User = mongoose.model('User', userSchema);

/**
 * Export Movie and User models for use across the application.
 * @module models
 */
module.exports = { Movie, User };
