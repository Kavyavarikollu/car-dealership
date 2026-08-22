const express = require("express");
const db = require("./db");

const app = express();

app.use(express.json());

app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    try {
        await db.promise().query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, password]
        );

        res.status(201).json({
            message: "User registered successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Registration failed"
        });
    }
});

module.exports = app;