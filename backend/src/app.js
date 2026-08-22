const express = require("express");

const app = express();

app.use(express.json());

app.post("/api/auth/register", (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    res.status(201).json({
        message: "User registered successfully"
    });
});

module.exports = app;