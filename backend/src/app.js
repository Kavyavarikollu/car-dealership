const express = require("express");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());


// ================= REGISTER =================

app.post("/api/auth/register", async (req, res) => {

    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({
            message: "Passwords do not match"
        });
    }

    // Name validation
    if (name.trim().length === 0) {
        return res.status(400).json({
            message: "Name cannot be empty"
        });
    }

    if (name.trim().length < 2) {
        return res.status(400).json({
            message: "Name must be at least 2 characters"
        });
    }

    if (name.trim().length > 50) {
        return res.status(400).json({
            message: "Name must not exceed 50 characters"
        });
    }

    const nameRegex = /^[A-Za-z\s-]+$/;

    if (!nameRegex.test(name.trim())) {
        return res.status(400).json({
            message: "Name contains invalid characters"
        });
    }

    // Email validation
    if (email !== email.trim() || email.includes(" ")) {
        return res.status(400).json({
            message: "Email cannot contain spaces"
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: "Invalid email format"
        });
    }

    // NEW: normalize email
    const normalizedEmail = email.toLowerCase();

    // Password validation
    if (password !== password.trim()) {
        return res.status(400).json({
            message: "Password cannot start or end with spaces"
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: "Password must be at least 6 characters"
        });
    }

    if (password.length > 50) {
        return res.status(400).json({
            message: "Password must not exceed 50 characters"
        });
    }

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            message:
                "Password must contain uppercase, lowercase and number"
        });
    }

    try {

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.promise().query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name.trim(), normalizedEmail, hashedPassword]
        );

        return res.status(201).json({
            message: "User registered successfully"
        });

    } catch (error) {

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        console.error(error);

        return res.status(500).json({
            message: "Registration failed"
        });
    }
});


// ================= LOGIN =================

app.post("/api/auth/login", async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    // Email validation
    if (email !== email.trim() || email.includes(" ")) {
        return res.status(400).json({
            message: "Email cannot contain spaces"
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: "Invalid email format"
        });
    }

    // NEW: normalize login email
    const normalizedEmail = email.toLowerCase();

    // Password whitespace validation
    if (password !== password.trim()) {
        return res.status(400).json({
            message: "Password cannot start or end with spaces"
        });
    }

    // Password length validation
    if (password.length < 6) {
        return res.status(400).json({
            message: "Password must be at least 6 characters"
        });
    }

    if (password.length > 50) {
        return res.status(400).json({
            message: "Password must not exceed 50 characters"
        });
    }

    // Password strength validation
    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            message:
                "Password must contain uppercase, lowercase and number"
        });
    }

    try {

        const [rows] = await db.promise().query(
            "SELECT * FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = rows[0];

        const passwordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordCorrect) {
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

        return res.status(200).json({
            message: "Login successful",
            token: token
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Login failed"
        });
    }
});


// ================= PROFILE =================

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

        return res.status(200).json(rows[0]);

    } catch (error) {

        return res.status(401).json({
            message: "Unauthorized"
        });
    }
});


// ================= LOGOUT =================

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

        return res.status(200).json({
            message: "Logout successful"
        });

    } catch (error) {

        return res.status(401).json({
            message: "Unauthorized"
        });
    }
});


module.exports = app;