/**
 * @file passport.js
 * @description Configures authentication strategies for the myFlix API using Passport.
 * Provides:
 *  - LocalStrategy: validates username + password on login
 *  - JWTStrategy: authorizes users based on JSON Web Tokens
 */

const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Models = require('./models.js');
const passportJWT = require('passport-jwt');

let Users = Models.User;
let JWTStrategy = passportJWT.Strategy;
let ExtractJWT = passportJWT.ExtractJwt;

/**
 * LocalStrategy
 * Validates a username + password combination during login.
 *
 * @name LocalStrategy
 * @memberof module:passport
 * @function
 * @param {string} usernameField - The username field in the request (defaults to "username")
 * @param {string} passwordField - The password field in the request (defaults to "password")
 * @returns {Object} Authenticated user object or error message
 *
 * @description
 * - Looks up user by username  
 * - Compares provided password with hashed password in DB  
 * - Returns user if credentials are correct  
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password',
    },
    async (username, password, callback) => {
      try {
        const user = await Users.findOne({ username: username });

        if (!user) {
          console.log('Incorrect username');
          return callback(null, false, {
            message: 'Incorrect username.',
          });
        }

        // Validate password
        const isValid = bcrypt.compareSync(password, user.password);

        if (!isValid) {
          console.log('Incorrect password');
          return callback(null, false, {
            message: 'Incorrect password.',
          });
        }

        console.log('Login successful');
        return callback(null, user);
      } catch (error) {
        console.log(error);
        return callback(error);
      }
    }
  )
);

/**
 * JWTStrategy
 * Authenticates users based on a JSON Web Token passed in the Authorization header.
 *
 * @name JWTStrategy
 * @memberof module:passport
 * @function
 * @param {Object} jwtPayload - Decoded JWT payload containing user data
 * @param {string} jwtPayload._id - ID of the authenticated user
 * @returns {Object} Authenticated user or error message
 *
 * @description
 * - Extracts JWT from the "Authorization: Bearer <token>" header  
 * - Validates the token using the secret key  
 * - Retrieves the user associated with the token payload  
 */
passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'your_jwt_secret',
    },
    async (jwtPayload, callback) => {
      return await Users.findById(jwtPayload._id)
        .then((user) => {
          return callback(null, user);
        })
        .catch((error) => {
          return callback(error);
        });
    }
  )
);
