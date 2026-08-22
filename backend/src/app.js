const express = require("express");
const db = require("./db");
const bcrypt = require("bcryptjs");

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

module.exports = app;