/**
 * @file auth.js
 * @description Handles user authentication for the myFlix API, including login
 * and JWT token generation. Integrates Passport’s LocalStrategy for validating
 * user credentials and generates JSON Web Tokens for authenticated users.
 */

const jwtSecret = 'your_jwt_secret'; // Must match the key used in JWTStrategy
const jwt = require('jsonwebtoken');
const passport = require('passport');

require('./passport'); // Initialize Local & JWT strategies

/**
 * Generate a JSON Web Token (JWT) for an authenticated user.
 *
 * @function generateJWTToken
 * @param {Object} user - User object to encode into the JWT
 * @param {string} user.username - Username identifying the JWT subject
 * @returns {string} Signed JWT token
 *
 * @example
 * const token = generateJWTToken({ username: 'john123' });
 */
let generateJWTToken = (user) => {
  return jwt.sign(user, jwtSecret, {
    subject: user.username, // Username encoded in the JWT
    expiresIn: '7d',        // Token valid for 7 days
    algorithm: 'HS256'      // Secure hashing algorithm
  });
};

/**
 * Authentication routes for user login.
 * Exports a function that attaches the `/login` route to an Express router.
 *
 * @module auth
 * @param {express.Router} router - Express router instance
 * @returns {express.Router} Router with login route attached
 */
module.exports = (router) => {
  /**
   * User login endpoint.
   * Validates username and password using Passport LocalStrategy and, if successful,
   * returns a signed JWT token along with the user data.
   *
   * @name Login
   * @route POST /login
   * @group Authentication
   * @param {string} body.username.required - Username
   * @param {string} body.password.required - Password
   * @returns {Object} 200 - Authenticated user details and JWT token
   * @returns {Object} 400 - Login failed (invalid credentials)
   *
   * @example
   * POST /login
   * {
   *   "username": "john123",
   *   "password": "mypassword"
   * }
   *
   * Response:
   * {
   *   "user": { ... },
   *   "token": "eyJhbGciOiJIUzI1..."
   * }
   */
  router.post('/login', (req, res) => {
    passport.authenticate('local', { session: false }, (error, user, info) => {
      if (error || !user) {
        return res.status(400).json({
          message: 'Something is not right',
          user: user
        });
      }

      req.login(user, { session: false }, (error) => {
        if (error) {
          return res.send(error);
        }

        // Generate token
        let token = generateJWTToken(user.toJSON());
        return res.json({ user, token });
      });
    })(req, res);
  });

  return router; // VERY important!
};
