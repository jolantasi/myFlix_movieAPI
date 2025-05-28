const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Movie Schema
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

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  Birthday: Date,
  favoriteMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
});

// ✅ Hash password before saving user
userSchema.statics.hashPassword = function(password) {
  return bcrypt.hashSync(password, 10);
};

// ✅ Validate password (returns a Promise)
userSchema.methods.validatePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

// Models
const Movie = mongoose.model('Movie', movieSchema);
const User = mongoose.model('User', userSchema);

// Export models
module.exports = { Movie, User };
