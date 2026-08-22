const express = require("express");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());


// REGISTER
app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: "Invalid email format"
        });
    }

    // Password must be at least 6 characters
    if (password.length < 6) {
        return res.status(400).json({
            message: "Password must be at least 6 characters"
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.promise().query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: "User registered successfully"
        });

    } catch (error) {

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        res.status(500).json({
            message: "Registration failed"
        });
    }
});


// LOGIN
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = rows[0];

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET || "secretkey",
            {
                expiresIn: "1h"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token: token
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed"
        });
    }
});


// PROFILE
app.get("/api/auth/profile", async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "secretkey"
        );

        const [rows] = await db.promise().query(
            "SELECT id, name, email FROM users WHERE id = ?",
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        res.status(200).json(rows[0]);

    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }
});


// LOGOUT
app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        jwt.verify(
            token,
            process.env.JWT_SECRET || "secretkey"
        );

        res.status(200).json({
            message: "Logout successful"
        });

    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }
});


module.exports = app;