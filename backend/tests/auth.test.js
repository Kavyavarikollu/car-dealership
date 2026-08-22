const request = require("supertest");
const app = require("../src/app");

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
});