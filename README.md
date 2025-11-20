# 🎬 myFlix API

A RESTful server-side application that provides users with access to a movie database including films, genres, and directors.  
The API also supports user registration, login, updating profile information, and managing favorite movies.

This API is built using **Node.js**, **Express**, **MongoDB**, **Mongoose**, **Passport**, and **JWT-based authentication**.

---

## 📚 JSDoc Documentation

Full API documentation generated using JSDoc can be found in the `/out` directory of this repository.

If published (e.g., via GitHub Pages), add your link here:

👉 **Documentation:** _[Add link here]_

---

## 🚀 Features

- Retrieve all movies, movie by title, movies by genre, and movies by director
- User registration, login, profile update, and account deletion
- Add or remove favorite movies
- Password hashing and secure authentication using JWT
- Fully documented using JSDoc
- Input validation using `express-validator`
- Supports CORS and serves static files from `/public`

---

## 🛠️ Technologies Used

- **Node.js**
- **Express**
- **MongoDB + Mongoose**
- **Passport (Local + JWT Strategies)**
- **bcrypt**
- **jsonwebtoken**
- **express-validator**
- **Morgan (logger)**
- **JSDoc**

---

## 🔐 Authentication

This API uses **JWT (JSON Web Token)** authentication.

To access protected endpoints, include your token in the request header:

Authorization: Bearer <your_token_here>

```bash
Tokens are generated upon successful login at:
```

POST /login

```bash

---

## 📌 API Endpoints

### **Movies**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/movies` | Returns all movies |
| GET | `/movies/:title` | Returns a single movie by title |
| GET | `/genres/:genreName` | Returns genre details |
| GET | `/directors/:directorName` | Returns director details |
| GET | `/movies/genre/:genreName` | List movies by genre |
| GET | `/movies/director/:directorName` | List movies by director |

---

### **Users**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Register a new user |
| POST | `/login` | Log in a user + return JWT token |
| GET | `/users/:username` | Get user profile |
| PUT | `/users/:username` | Update user information |
| DELETE | `/users/:username` | Deregister user |
| POST | `/users/:username/movies/:MovieID` | Add favorite movie |
| DELETE | `/users/:username/movies/:MovieID` | Remove favorite movie |

---

## 📁 Static Files

Files in `/public` are served automatically by Express.

Example:

```

/public/css/style.css
/public/images/example.jpg

````bash
---

## 🧪 Example Responses

### 🎥 1. Get All Movies
```json
[
  {
    "title": "Inception",
    "description": "A skilled thief enters dreams to steal secrets.",
    "genre": { "name": "Sci-Fi", "description": "Science fiction" },
    "director": { "name": "Christopher Nolan", "bio": "British-American director" }
  }
]
````

👤 2. Register User

POST /users

```bash
{
  "username": "new_user",
  "password": "password123",
  "email": "example@mail.com"
}
```

🔐 3. Login User (example)
POST /login

```bash
{
  "user": {
    "username": "jolie",
    "email": "example@mail.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5..."
}
```

## 🏃 How to Run the Project Locally

1. Clone the repository:

```bash
git clone https://github.com/your-username/your-repo-name.git
```

2. Install dependencies:

```bash
npm install
```

3. Add a .env file:

```bash
CONNECTION_URI=your_mongodb_connection_string
PORT=8080
```

4. Start the server:

```bash
npm start
```

Server will run at:

```bash
http://localhost:8080
```

## 🧩 Folder Structure

```bash
myFlix-api/
│
├── index.js
├── auth.js
├── passport.js
├── models.js
├── public/
├── out/             ← JSDoc HTML documentation
├── package.json
└── jsdoc.json
```

## 📄 License

This project is created for educational purposes as part of the CareerFoundry Full-Stack Web Development Program.

## 🙌 Author

Jolanta Simkute
Full-Stack Web Development Student at CareeCareerFoundry
