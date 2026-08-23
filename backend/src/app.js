const express = require("express");
const cors = require("cors");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use((req, res, next) => {
    res.header(
        "Access-Control-Allow-Origin",
        "http://localhost:5173"
    );

    res.header(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS"
    );

    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json());


// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

function authenticateToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || !parts[1]) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    try {

        const decoded = jwt.verify(
            parts[1],
            process.env.JWT_SECRET || "secretkey"
        );

        if (
            !decoded.id ||
            !decoded.email ||
            typeof decoded.id !== "number" ||
            decoded.id <= 0
        ) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Unauthorized"
        });
    }
}


// =====================================================
// ADMIN MIDDLEWARE
// =====================================================

async function requireAdmin(req, res, next) {

    try {

        const [rows] = await db.promise().query(
            "SELECT role FROM users WHERE id = ?",
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (rows[0].role !== "admin") {
            return res.status(403).json({
                message: "Admin access required"
            });
        }

        next();

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Authorization failed"
        });
    }
}


// =====================================================
// REGISTER
// =====================================================

app.post("/api/auth/register", async (req, res) => {

    const {
        name,
        email,
        password,
        confirmPassword
    } = req.body;

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

        const normalizedEmail = email.toLowerCase();

        const hashedPassword =
            await bcrypt.hash(password, 10);

        await db.promise().query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [
                name.trim(),
                normalizedEmail,
                hashedPassword
            ]
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


// =====================================================
// LOGIN
// =====================================================

app.post("/api/auth/login", async (req, res) => {

    const {
        email,
        password
    } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

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

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
        return res.status(400).json({
            message:
                "Password must contain uppercase, lowercase and number"
        });
    }

    try {

        const normalizedEmail = email.toLowerCase();

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

        const passwordCorrect =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // ROLE INCLUDED IN TOKEN
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
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


// =====================================================
// PROFILE
// =====================================================

// =====================================================
// PROFILE
// =====================================================

app.get(
    "/api/auth/profile",
    authenticateToken,
    async (req, res) => {

        try {

            const [rows] = await db.promise().query(
                "SELECT id, name, email, role FROM users WHERE id = ?",
                [req.user.id]
            );

            if (rows.length === 0) {
                return res.status(401).json({
                    message: "Unauthorized"
                });
            }

            return res.status(200).json({
                id: rows[0].id,
                name: rows[0].name,
                email: rows[0].email,
                role: rows[0].role
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                message: "Failed to fetch profile"
            });
        }
    }
);


// =====================================================
// LOGOUT
// =====================================================

app.post(
    "/api/auth/logout",
    authenticateToken,
    (req, res) => {

        return res.status(200).json({
            message: "Logout successful"
        });
    }
);


// =====================================================
// ADD VEHICLE
// =====================================================

app.post(
    "/api/vehicles",
    authenticateToken,
    async (req, res) => {

        const {
            make,
            model,
            category,
            price,
            quantity
        } = req.body;

        if (
            !make ||
            !model ||
            !category ||
            price === undefined ||
            quantity === undefined
        ) {
            return res.status(400).json({
                message: "All vehicle fields are required"
            });
        }

        if (
            typeof price !== "number" ||
            price <= 0
        ) {
            return res.status(400).json({
                message: "Price must be greater than 0"
            });
        }

        if (
            typeof quantity !== "number" ||
            quantity < 0 ||
            !Number.isInteger(quantity)
        ) {
            return res.status(400).json({
                message: "Quantity must be a non-negative integer"
            });
        }

        try {

            const [result] =
                await db.promise().query(
                    `INSERT INTO vehicles
                    (make, model, category, price, quantity)
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        make.trim(),
                        model.trim(),
                        category.trim(),
                        price,
                        quantity
                    ]
                );

            const [rows] =
                await db.promise().query(
                    "SELECT * FROM vehicles WHERE id = ?",
                    [result.insertId]
                );

            return res.status(201).json({
                message: "Vehicle added successfully",
                vehicle: rows[0]
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                message: "Failed to add vehicle"
            });
        }
    }
);


// =====================================================
// GET ALL AVAILABLE VEHICLES
// =====================================================

app.get(
    "/api/vehicles",
    authenticateToken,
    async (req, res) => {

        try {

            const [rows] =
                await db.promise().query(
                    `SELECT * FROM vehicles
                     WHERE quantity > 0
                     ORDER BY id DESC`
                );

            return res.status(200).json(rows);

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                message: "Failed to fetch vehicles"
            });
        }
    }
);


// =====================================================
// SEARCH VEHICLES
// =====================================================

app.get(
    "/api/vehicles/search",
    authenticateToken,
    async (req, res) => {

        const {
            make,
            model,
            category,
            minPrice,
            maxPrice
        } = req.query;

        let query = `
            SELECT * FROM vehicles
            WHERE quantity > 0
        `;

        const values = [];

        if (make) {
            query += " AND LOWER(make) LIKE LOWER(?)";
            values.push(`%${make}%`);
        }

        if (model) {
            query += " AND LOWER(model) LIKE LOWER(?)";
            values.push(`%${model}%`);
        }

        if (category) {
            query += " AND LOWER(category) LIKE LOWER(?)";
            values.push(`%${category}%`);
        }

        if (minPrice !== undefined) {

            const minimum = Number(minPrice);

            if (Number.isNaN(minimum) || minimum < 0) {
                return res.status(400).json({
                    message: "Invalid minimum price"
                });
            }

            query += " AND price >= ?";
            values.push(minimum);
        }

        if (maxPrice !== undefined) {

            const maximum = Number(maxPrice);

            if (Number.isNaN(maximum) || maximum < 0) {
                return res.status(400).json({
                    message: "Invalid maximum price"
                });
            }

            query += " AND price <= ?";
            values.push(maximum);
        }

        if (
            minPrice !== undefined &&
            maxPrice !== undefined &&
            Number(minPrice) > Number(maxPrice)
        ) {
            return res.status(400).json({
                message: "Minimum price cannot exceed maximum price"
            });
        }

        query += " ORDER BY id DESC";

        try {

            const [rows] =
                await db.promise().query(
                    query,
                    values
                );

            return res.status(200).json(rows);

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                message: "Vehicle search failed"
            });
        }
    }
);


// =====================================================
// UPDATE VEHICLE
// =====================================================

app.put(
    "/api/vehicles/:id",
    authenticateToken,
    async (req, res) => {

        const vehicleId = Number(req.params.id);

        if (
            !Number.isInteger(vehicleId) ||
            vehicleId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid vehicle ID"
            });
        }

        const {
            make,
            model,
            category,
            price,
            quantity
        } = req.body;

        if (
            !make ||
            !model ||
            !category ||
            price === undefined ||
            quantity === undefined
        ) {
            return res.status(400).json({
                message: "All vehicle fields are required"
            });
        }

        if (
            typeof price !== "number" ||
            price <= 0
        ) {
            return res.status(400).json({
                message: "Price must be greater than 0"
            });
        }

        if (
            typeof quantity !== "number" ||
            quantity < 0 ||
            !Number.isInteger(quantity)
        ) {
            return res.status(400).json({
                message: "Quantity must be a non-negative integer"
            });
        }

        try {

            const [existing] =
                await db.promise().query(
                    "SELECT id FROM vehicles WHERE id = ?",
                    [vehicleId]
                );

            if (existing.length === 0) {
                return res.status(404).json({
                    message: "Vehicle not found"
                });
            }

            await db.promise().query(
                `UPDATE vehicles
                 SET make = ?,
                     model = ?,
                     category = ?,
                     price = ?,
                     quantity = ?
                 WHERE id = ?`,
                [
                    make.trim(),
                    model.trim(),
                    category.trim(),
                    price,
                    quantity,
                    vehicleId
                ]
            );

            const [rows] =
                await db.promise().query(
                    "SELECT * FROM vehicles WHERE id = ?",
                    [vehicleId]
                );

            return res.status(200).json({
                message: "Vehicle updated successfully",
                vehicle: rows[0]
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                message: "Failed to update vehicle"
            });
        }
    }
);


// =====================================================
// PURCHASE VEHICLE
// =====================================================

// =====================================================
// PURCHASE VEHICLE
// =====================================================

app.post(
    "/api/vehicles/:id/purchase",
    authenticateToken,
    async (req, res) => {

        const vehicleId = Number(req.params.id);
        const userId = req.user.id;

        if (
            !Number.isInteger(vehicleId) ||
            vehicleId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid vehicle ID"
            });
        }

        try {

            const [rows] =
                await db.promise().query(
                    "SELECT * FROM vehicles WHERE id = ?",
                    [vehicleId]
                );

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Vehicle not found"
                });
            }

            const vehicle = rows[0];

            if (vehicle.quantity <= 0) {
                return res.status(400).json({
                    message: "Vehicle is out of stock"
                });
            }

            // Decrease vehicle stock
            await db.promise().query(
                `UPDATE vehicles
                 SET quantity = quantity - 1
                 WHERE id = ? AND quantity > 0`,
                [vehicleId]
            );

            // Save purchase history
            await db.promise().query(
                `INSERT INTO purchases
                 (user_id, vehicle_id, price)
                 VALUES (?, ?, ?)`,
                [
                    userId,
                    vehicleId,
                    vehicle.price
                ]
            );

            // Get updated vehicle
            const [updatedRows] =
                await db.promise().query(
                    "SELECT * FROM vehicles WHERE id = ?",
                    [vehicleId]
                );

            return res.status(200).json({
                message: "Vehicle purchased successfully",
                vehicle: updatedRows[0]
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                message: "Purchase failed"
            });
        }
    }
);
// =====================================================
// GET MY PURCHASES
// =====================================================

app.get(
    "/api/purchases",
    authenticateToken,
    async (req, res) => {

        const userId = req.user.id;

        try {

            const [rows] = await db.promise().query(
                `SELECT
                    p.id,
                    p.vehicle_id,
                    v.make,
                    v.model,
                    v.category,
                    p.price,
                    p.purchased_at
                 FROM purchases p
                 JOIN vehicles v
                   ON p.vehicle_id = v.id
                 WHERE p.user_id = ?
                 ORDER BY p.purchased_at DESC`,
                [userId]
            );

            return res.status(200).json({
                purchases: rows
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                message: "Failed to fetch purchases"
            });
        }
    }
);

// =====================================================
// DELETE VEHICLE - ADMIN ONLY
// =====================================================

app.delete(
    "/api/vehicles/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        const vehicleId = Number(req.params.id);

        if (
            !Number.isInteger(vehicleId) ||
            vehicleId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid vehicle ID"
            });
        }

        try {

            const [rows] =
                await db.promise().query(
                    "SELECT id FROM vehicles WHERE id = ?",
                    [vehicleId]
                );

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Vehicle not found"
                });
            }

            await db.promise().query(
                "DELETE FROM vehicles WHERE id = ?",
                [vehicleId]
            );

            return res.status(200).json({
                message: "Vehicle deleted successfully"
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                message: "Failed to delete vehicle"
            });
        }
    }
);


// =====================================================
// RESTOCK VEHICLE - ADMIN ONLY
// =====================================================

app.post(
    "/api/vehicles/:id/restock",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        const vehicleId = Number(req.params.id);

        const { quantity } = req.body;

        if (
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        if (
            !Number.isInteger(vehicleId) ||
            vehicleId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid vehicle ID"
            });
        }

        try {

            const [rows] =
                await db.promise().query(
                    "SELECT id FROM vehicles WHERE id = ?",
                    [vehicleId]
                );

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Vehicle not found"
                });
            }

            await db.promise().query(
                `UPDATE vehicles
                 SET quantity = quantity + ?
                 WHERE id = ?`,
                [
                    quantity,
                    vehicleId
                ]
            );

            const [updatedRows] =
                await db.promise().query(
                    "SELECT * FROM vehicles WHERE id = ?",
                    [vehicleId]
                );

            return res.status(200).json({
                message: "Vehicle restocked successfully",
                vehicle: updatedRows[0]
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                message: "Restock failed"
            });
        }
    }
);


module.exports = app;