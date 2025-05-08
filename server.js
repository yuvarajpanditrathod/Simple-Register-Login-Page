const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect("mongodb+srv://yuvrajrathod870:root@docket-deploy.bdlodpz.mongodb.net/student-course-registration?retryWrites=true&w=majority&appName=Docket-Deploy", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
    console.log("MongoDB connected successfully!");
});

// Define schemas and models
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    registeredCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
});

const courseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    credits: { type: Number, required: true },
    instructor: { type: String, required: true },
    schedule: { type: String, required: true },
    capacity: { type: Number, required: true },
    enrolled: { type: Number, default: 0 }
});

const User = mongoose.model("User", userSchema);
const Course = mongoose.model("Course", courseSchema);

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Seed initial courses (run once)
async function seedCourses() {
    const count = await Course.countDocuments();
    if (count === 0) {
        const courses = [
            {
                code: "CS101",
                title: "Introduction to Computer Science",
                description: "Fundamentals of computing and programming concepts",
                credits: 3,
                instructor: "Dr. Smith",
                schedule: "Mon/Wed 10:00-11:30",
                capacity: 50
            },
            {
                code: "MATH201",
                title: "Calculus I",
                description: "Limits, derivatives, and applications of differentiation",
                credits: 4,
                instructor: "Prof. Johnson",
                schedule: "Tue/Thu 13:00-14:30",
                capacity: 40
            },
            {
                code: "ENG105",
                title: "Academic Writing",
                description: "Developing writing skills for academic purposes",
                credits: 3,
                instructor: "Dr. Williams",
                schedule: "Mon/Wed 14:00-15:30",
                capacity: 35
            },
            {
                code: "PHYS202",
                title: "University Physics",
                description: "Mechanics, thermodynamics, and waves",
                credits: 4,
                instructor: "Prof. Brown",
                schedule: "Tue/Thu 10:00-11:30",
                capacity: 45
            },
            {
                code: "CHEM101",
                title: "General Chemistry",
                description: "Basic principles of chemistry with laboratory",
                credits: 4,
                instructor: "Dr. Davis",
                schedule: "Mon/Wed/Fri 9:00-10:30",
                capacity: 40
            },
            {
                code: "BIO110",
                title: "Biology for Majors",
                description: "Cell biology, genetics, and evolution",
                credits: 4,
                instructor: "Prof. Miller",
                schedule: "Tue/Thu 15:00-16:30",
                capacity: 30
            },
            {
                code: "PSY101",
                title: "Introduction to Psychology",
                description: "Survey of major psychological concepts and theories",
                credits: 3,
                instructor: "Dr. Wilson",
                schedule: "Mon/Wed 11:00-12:30",
                capacity: 50
            },
            {
                code: "HIST205",
                title: "World History",
                description: "Survey of world civilizations from ancient times",
                credits: 3,
                instructor: "Prof. Moore",
                schedule: "Tue/Thu 11:00-12:30",
                capacity: 40
            },
            {
                code: "ART120",
                title: "Fundamentals of Design",
                description: "Principles of visual organization and composition",
                credits: 3,
                instructor: "Dr. Taylor",
                schedule: "Fri 13:00-16:00",
                capacity: 25
            },
            {
                code: "ECON101",
                title: "Principles of Economics",
                description: "Introduction to micro and macroeconomic principles",
                credits: 3,
                instructor: "Prof. Anderson",
                schedule: "Mon/Wed 16:00-17:30",
                capacity: 45
            }
        ];

        await Course.insertMany(courses);
        console.log("Courses seeded successfully!");
    }
}

// Routes
app.get("/", (req, res) => res.redirect("/login"));

// Registration routes
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.post("/register", async (req, res) => {
    const { username, email, phone, password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            username,
            email,
            phone,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        if (err.code === 11000) {
            res.status(400).json({ error: "Email already exists" });
        } else {
            console.error(err);
            res.status(500).json({ error: "Registration failed" });
        }
    }
});

// Login routes
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        res.json({ message: "Login successful", username: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
});

// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: "Logout failed" });
        }
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
});

// Course routes
app.get("/api/courses", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const courses = await Course.find();
        res.json(courses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch courses" });
    }
});

app.get("/api/user/courses", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const user = await User.findById(req.session.user.id).populate('registeredCourses');
        res.json(user.registeredCourses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user courses" });
    }
});

app.post("/api/courses/register", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { courseId } = req.body;

    try {
        // Check if course exists and has capacity
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }
        if (course.enrolled >= course.capacity) {
            return res.status(400).json({ error: "Course is full" });
        }

        // Check if user is already registered
        const user = await User.findById(req.session.user.id);
        if (user.registeredCourses.includes(courseId)) {
            return res.status(400).json({ error: "Already registered for this course" });
        }

        // Update course enrollment
        course.enrolled += 1;
        await course.save();

        // Add course to user's registered courses
        user.registeredCourses.push(courseId);
        await user.save();

        res.json({ message: "Course registration successful", course });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Course registration failed" });
    }
});

app.delete("/api/courses/drop/:courseId", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { courseId } = req.params;

    try {
        // Remove course from user's registered courses
        const user = await User.findById(req.session.user.id);
        user.registeredCourses = user.registeredCourses.filter(id => id.toString() !== courseId);
        await user.save();

        // Update course enrollment
        const course = await Course.findById(courseId);
        if (course) {
            course.enrolled = Math.max(0, course.enrolled - 1);
            await course.save();
        }

        res.json({ message: "Course dropped successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to drop course" });
    }
});

// Home route
app.get("/home", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.sendFile(path.join(__dirname, "views", "home.html"));
});

// Get current user info
app.get("/api/user", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    res.json(req.session.user);
});

// Start server and seed courses
app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
    await seedCourses();
});
