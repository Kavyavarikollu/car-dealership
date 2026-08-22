const request = require("supertest");
const app = require("../src/app");
const db = require("../src/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

describe("User Registration", () => {

    test("should register a new user", async () => {
        const email = `kavya_${Date.now()}@test.com`;

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: email,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(201);
    });


    test("should reject registration when email is missing", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration with empty name", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "   ",
                email: `empty_${Date.now()}@test.com`,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration with invalid email", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: "kavya2026",
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration with email containing spaces", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: " kavya@test.com ",
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration with short password", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: `short_${Date.now()}@test.com`,
                password: "Kav1",
                confirmPassword: "Kav1"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration with long password", async () => {
        const password =
            "Kavya12345678901234567890123456789012345678901234567890";

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: `long_${Date.now()}@test.com`,
                password: password,
                confirmPassword: password
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration with name shorter than 2 characters", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "K",
                email: `shortname_${Date.now()}@test.com`,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration with name longer than 50 characters", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ",
                email: `longname_${Date.now()}@test.com`,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration with invalid name characters", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya123",
                email: `invalidname_${Date.now()}@test.com`,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject password without uppercase letter", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: `noupper_${Date.now()}@test.com`,
                password: "kavya123",
                confirmPassword: "kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject password without lowercase letter", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: `nolower_${Date.now()}@test.com`,
                password: "KAVYA123",
                confirmPassword: "KAVYA123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject password without number", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: `nonumber_${Date.now()}@test.com`,
                password: "KavyaPassword",
                confirmPassword: "KavyaPassword"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration with password containing leading or trailing spaces", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: `space_${Date.now()}@test.com`,
                password: " Kavya123 ",
                confirmPassword: " Kavya123 "
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration when confirm password is missing", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: `missingconfirm_${Date.now()}@test.com`,
                password: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration when passwords do not match", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: `mismatch_${Date.now()}@test.com`,
                password: "Kavya123",
                confirmPassword: "Kavya456"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should save the user in the database", async () => {
        const email = `database_${Date.now()}@test.com`;

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Database User",
                email: email,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(201);

        const [rows] = await db.promise().query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        expect(rows.length).toBe(1);
    });


    test("should store a hashed password", async () => {
        const email = `hash_${Date.now()}@test.com`;
        const password = "Kavya123";

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Hash User",
                email: email,
                password: password,
                confirmPassword: password
            });

        expect(response.statusCode).toBe(201);

        const [rows] = await db.promise().query(
            "SELECT password FROM users WHERE email = ?",
            [email]
        );

        expect(rows.length).toBe(1);
        expect(rows[0].password).not.toBe(password);

        expect(
            await bcrypt.compare(password, rows[0].password)
        ).toBe(true);
    });


    test("should reject duplicate email", async () => {
        const email = `duplicate_${Date.now()}@test.com`;

        const firstResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "First User",
                email: email,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(firstResponse.statusCode).toBe(201);

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Second User",
                email: email,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(409);
    });


    test("should login with correct credentials", async () => {
        const email = `login_${Date.now()}@test.com`;
        const password = "Kavya123";

        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Login User",
                email: email,
                password: password,
                confirmPassword: password
            });

        expect(registerResponse.statusCode).toBe(201);

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
                password: "Kavya123"
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
                password: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject login with email containing spaces", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: " login@test.com ",
                password: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject login with password containing leading or trailing spaces", async () => {
        const email = `loginspace_${Date.now()}@test.com`;

        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Login Space User",
                email: email,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(registerResponse.statusCode).toBe(201);

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: email,
                password: " Kavya123 "
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject login with short password", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@test.com",
                password: "Kav1"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject login with long password", async () => {
        const password =
            "Kavya12345678901234567890123456789012345678901234567890";

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@test.com",
                password: password
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject login password without uppercase letter", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@test.com",
                password: "kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject login password without lowercase letter", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@test.com",
                password: "KAVYA123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject login password without number", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@test.com",
                password: "KavyaPassword"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject login with wrong password", async () => {
        const email = `wrongpass_${Date.now()}@test.com`;

        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Wrong Password User",
                email: email,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(registerResponse.statusCode).toBe(201);

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: email,
                password: "Wrong123"
            });

        expect(response.statusCode).toBe(401);
    });


    test("should reject login with unknown email", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: `unknown_${Date.now()}@test.com`,
                password: "Kavya123"
            });

        expect(response.statusCode).toBe(401);
    });


    test("should access protected profile with valid token", async () => {
        const email = `profile_${Date.now()}@test.com`;
        const password = "Kavya123";

        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Profile User",
                email: email,
                password: password,
                confirmPassword: password
            });

        expect(registerResponse.statusCode).toBe(201);

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: email,
                password: password
            });

        expect(loginResponse.statusCode).toBe(200);

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
        const email = `secureprofile_${Date.now()}@test.com`;
        const password = "Kavya123";

        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Secure Profile User",
                email: email,
                password: password,
                confirmPassword: password
            });

        expect(registerResponse.statusCode).toBe(201);

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: email,
                password: password
            });

        expect(loginResponse.statusCode).toBe(200);

        const token = loginResponse.body.token;

        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.email).toBe(email);
        expect(response.body.password).toBeUndefined();
    });


    test("should logout successfully with valid token", async () => {
        const email = `logout_${Date.now()}@test.com`;
        const password = "Kavya123";

        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Logout User",
                email: email,
                password: password,
                confirmPassword: password
            });

        expect(registerResponse.statusCode).toBe(201);

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: email,
                password: password
            });

        expect(loginResponse.statusCode).toBe(200);

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


    test("should login with uppercase email", async () => {
        const email = `uppercase_${Date.now()}@test.com`;
        const password = "Kavya123";

        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Uppercase User",
                email: email,
                password: password,
                confirmPassword: password
            });

        expect(registerResponse.statusCode).toBe(201);

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: email.toUpperCase(),
                password: password
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.token).toBeDefined();
    });


    test("should login with mixed case email", async () => {
        const email = `mixedcase_${Date.now()}@test.com`;
        const password = "Kavya123";

        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Mixed Case User",
                email: email,
                password: password,
                confirmPassword: password
            });

        expect(registerResponse.statusCode).toBe(201);

        const mixedEmail =
            email.substring(0, 5).toUpperCase() +
            email.substring(5);

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: mixedEmail,
                password: password
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.token).toBeDefined();
    });


    test("should store registration email in lowercase", async () => {
        const email = `LOWERCASE_${Date.now()}@TEST.COM`;
        const expectedEmail = email.toLowerCase();

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Lowercase User",
                email: email,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(201);

        const [rows] = await db.promise().query(
            "SELECT email FROM users WHERE email = ?",
            [expectedEmail]
        );

        expect(rows.length).toBe(1);
        expect(rows[0].email).toBe(expectedEmail);
    });


    test("should reject profile with Bearer only", async () => {
        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", "Bearer");

        expect(response.statusCode).toBe(401);
    });


    test("should reject profile with empty Bearer token", async () => {
        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", "Bearer ");

        expect(response.statusCode).toBe(401);
    });


    test("should reject profile with Basic authorization", async () => {
        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", "Basic abc123");

        expect(response.statusCode).toBe(401);
    });


    test("should reject profile with extra authorization values", async () => {
        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", "Bearer token extra");

        expect(response.statusCode).toBe(401);
    });


    test("should reject profile with JWT missing id", async () => {
        const token = jwt.sign(
            {
                email: "test@test.com"
            },
            process.env.JWT_SECRET || "secretkey",
            {
                expiresIn: "1h"
            }
        );

        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(401);
    });


    test("should reject profile with JWT missing email", async () => {
        const token = jwt.sign(
            {
                id: 1
            },
            process.env.JWT_SECRET || "secretkey",
            {
                expiresIn: "1h"
            }
        );

        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(401);
    });


    test("should reject profile with invalid JWT id", async () => {
        const token = jwt.sign(
            {
                id: -1,
                email: "test@test.com"
            },
            process.env.JWT_SECRET || "secretkey",
            {
                expiresIn: "1h"
            }
        );

        const response = await request(app)
            .get("/api/auth/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(401);
    });


    test("should reject logout with Bearer only", async () => {
        const response = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", "Bearer");

        expect(response.statusCode).toBe(401);
    });


    test("should reject logout with Basic authorization", async () => {
        const response = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", "Basic abc123");

        expect(response.statusCode).toBe(401);
    });


    test("should reject logout with invalid JWT", async () => {
        const response = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", "Bearer invalid.jwt.token");

        expect(response.statusCode).toBe(401);
    });


    test("should reject registration with email containing only spaces", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: "   ",
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject login with email containing only spaces", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "   ",
                password: "Kavya123"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject registration with password containing only spaces", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Kavya",
                email: `spaces_${Date.now()}@test.com`,
                password: "      ",
                confirmPassword: "      "
            });

        expect(response.statusCode).toBe(400);
    });


    afterAll((done) => {
        db.end(done);
    });

});