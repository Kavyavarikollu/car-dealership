const request = require("supertest");
const app = require("../src/app");
const db = require("../src/db");
const bcrypt = require("bcryptjs");

describe("User Registration", () => {

    test("should register a new user", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: "kavya5@test.com",
                password: "123456"
            });

        expect(response.statusCode).toBe(201);
    });

    test("should reject registration when email is missing", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                password: "123456"
            });

        expect(response.statusCode).toBe(400);
    });

    test("should save the user in the database", async () => {
        const email = "database3@test.com";

        await request(app)
            .post("/api/auth/register")
            .send({
                name: "Database User",
                email: email,
                password: "123456"
            });

        const [rows] = await db.promise().query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        expect(rows.length).toBe(1);
    });

    test("should store a hashed password", async () => {
        const email = "hash3@test.com";
        const password = "123456";

        await request(app)
            .post("/api/auth/register")
            .send({
                name: "Hash User",
                email: email,
                password: password
            });

        const [rows] = await db.promise().query(
            "SELECT password FROM users WHERE email = ?",
            [email]
        );

        expect(rows.length).toBe(1);
        expect(rows[0].password).not.toBe(password);
        expect(await bcrypt.compare(password, rows[0].password)).toBe(true);
    });

    test("should reject duplicate email", async () => {
        const email = "duplicate@test.com";

        await request(app)
            .post("/api/auth/register")
            .send({
                name: "First User",
                email: email,
                password: "123456"
            });

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Second User",
                email: email,
                password: "123456"
            });

        expect(response.statusCode).toBe(409);
    });

});