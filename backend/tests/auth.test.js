const request = require("supertest");
const app = require("../src/app");
const db = require("../src/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

describe("User Registration", () => {

    test("should register a new user", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
email: "kavya20260822_2049@test.com",
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

    test("should reject registration with empty name", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "   ",
                email: "emptyname@test.com",
                password: "123456"
            });

        expect(response.statusCode).toBe(400);
    });

    test("should reject registration with invalid email", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: "kavya2026",
                password: "123456"
            });

        expect(response.statusCode).toBe(400);
    });

    test("should reject registration with short password", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: "shortpassword@test.com",
                password: "123"
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

    test("should login with correct credentials", async () => {
        const email = "login@test.com";
        const password = "123456";

        await request(app)
            .post("/api/auth/register")
            .send({
                name: "Login User",
                email: email,
                password: password
            });

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: email,
                password: password
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.token).toBeDefined();
    });

    test("should reject login when email is missing", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                password: "123456"
            });

        expect(response.statusCode).toBe(400);
    });

    test("should reject login when password is missing", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "login@test.com"
            });

        expect(response.statusCode).toBe(400);
    });

    test("should reject login with invalid email", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "invalidemail",
                password: "123456"
            });

        expect(response.statusCode).toBe(400);
    });

    test("should reject login with wrong password", async () => {
        const email = "wrongpass@test.com";
        const password = "123456";

        await request(app)
            .post("/api/auth/register")
            .send({
                name: "Wrong Password User",
                email: email,
                password: password
            });

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: email,
                password: "wrongpassword"
            });

        expect(response.statusCode).toBe(401);
    });

    test("should reject login with unknown email", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "unknown@test.com",
                password: "123456"
            });

        expect(response.statusCode).toBe(401);
    });

    test("should access protected profile with valid token", async () => {
        const email = "profile@test.com";
        const password = "123456";

        await request(app)
            .post("/api/auth/register")
            .send({
                name: "Profile User",
                email: email,
                password: password
            });

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: email,
                password: password
            });

        const token = loginResponse.body.token;

        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.email).toBe(email);
    });

    test("should reject profile access without token", async () => {
        const response = await request(app)
            .get("/api/auth/profile");

        expect(response.statusCode).toBe(401);
    });

    test("should reject profile access with invalid token", async () => {
        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", "Bearer invalidtoken");

        expect(response.statusCode).toBe(401);
    });

    test("should reject expired token", async () => {
        const token = jwt.sign(
            {
                id: 1,
                email: "expired@test.com"
            },
            process.env.JWT_SECRET || "secretkey",
            {
                expiresIn: "-1s"
            }
        );

        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(401);
    });

    test("should reject invalid authorization format", async () => {
        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", "invalid");

        expect(response.statusCode).toBe(401);
    });

    test("should not expose password in profile", async () => {
        const email = "secureprofile@test.com";
        const password = "123456";

        await request(app)
            .post("/api/auth/register")
            .send({
                name: "Secure Profile User",
                email: email,
                password: password
            });

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: email,
                password: password
            });

        const token = loginResponse.body.token;

        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.email).toBe(email);
        expect(response.body.password).toBeUndefined();
    });

    test("should logout successfully with valid token", async () => {
        const email = "logout@test.com";
        const password = "123456";

        await request(app)
            .post("/api/auth/register")
            .send({
                name: "Logout User",
                email: email,
                password: password
            });

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: email,
                password: password
            });

        const token = loginResponse.body.token;

        const response = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Logout successful");
    });

    test("should reject logout without token", async () => {
        const response = await request(app)
            .post("/api/auth/logout");

        expect(response.statusCode).toBe(401);
    });

    test("should reject logout with invalid token", async () => {
        const response = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", "Bearer invalidtoken");

        expect(response.statusCode).toBe(401);
    });

test("should reject registration with name shorter than 2 characters", async () => {
    const response = await request(app)
        .post("/api/auth/register")
        .send({
            name: "K",
            email: "shortname@test.com",
            password: "123456"
        });

    expect(response.statusCode).toBe(400);
});
    afterAll((done) => {
        db.end(done);
    });

});