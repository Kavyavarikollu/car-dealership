const request = require("supertest");
const app = require("../src/app");
const db = require("../src/db");

describe("User Registration", () => {
    test("should register a new user", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: "kavya@test.com",
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
        const email = "database@test.com";

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
});