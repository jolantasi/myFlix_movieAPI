const bcrypt = require('bcrypt');
const passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  Models = require('./models.js'),
  passportJWT = require('passport-jwt');

let Users = Models.User,
  JWTStrategy = passportJWT.Strategy,
  ExtractJWT = passportJWT.ExtractJwt;

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

        // ✅ Try sync compare to avoid async/callback mismatch
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

passport.use(new JWTStrategy({
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'your_jwt_secret'
}, async (jwtPayload, callback) => {
  return await Users.findById(jwtPayload._id)
    .then((user) => {
      return callback(null, user);
    })
    .catch((error) => {
      return callback(error)
    });
}));
