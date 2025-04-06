const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;
const cors = require("cors");

const cors = require('cors');
app.use(cors({
  origin: 'https://your-frontend.vercel.app',
  credentials: true
}));


// SQLite DB
const db = new sqlite3.Database("./database.sqlite");
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    password TEXT
)`);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true
}));

app.use(cors({
    origin: 'https://simple-login-register-page.vercel.app',
    credentials: true
  }));

  app.use(cors());

// Routes
app.get("/", (req, res) => res.redirect("/login"));

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.post("/register", (req, res) => {
    const { username, email, phone, password, confirmPassword } = req.body;
    if (password !== confirmPassword) return res.send("Passwords do not match.");

    db.run(`INSERT INTO users (username, email, phone, password) VALUES (?, ?, ?, ?)`, 
        [username, email, phone, password], 
        (err) => {
            if (err) return res.send("Registration error: User might already exist.");
            res.redirect("/login");
        });
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, 
        [email, password], 
        (err, user) => {
            if (user) {
                req.session.user = user;
                res.redirect("/home");
            } else {
                res.send("Invalid email or password.");
            }
        });
});

app.get("/home", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.sendFile(path.join(__dirname, "views", "home.html"));
});

app.get("/username", (req, res) => {
    if (req.session.user) {
        res.json({ username: req.session.user.username });
    } else {
        res.json({ username: "Guest" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
