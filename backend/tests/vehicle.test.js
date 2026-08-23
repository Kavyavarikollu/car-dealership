const request = require("supertest");
const app = require("../src/app");
const db = require("../src/db");

describe("Vehicle Inventory", () => {

    let token;
    let adminToken;
    let vehicleId;
    let purchaseVehicleId;
    let deleteVehicleId;

    // =====================================================
    // CREATE USERS
    // =====================================================

    beforeAll(async () => {

        // Normal user
        const userEmail =
            `vehicleuser_${Date.now()}@test.com`;

        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Vehicle User",
                email: userEmail,
                password: "Kavya123",
                confirmPassword: "Kavya123"
            });

        expect(registerResponse.statusCode).toBe(201);

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: userEmail,
                password: "Kavya123"
            });

        expect(loginResponse.statusCode).toBe(200);

        token = loginResponse.body.token;


        // Admin user
        const adminEmail =
            `admin_${Date.now()}@test.com`;

        const adminRegisterResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Admin User",
                email: adminEmail,
                password: "Admin123",
                confirmPassword: "Admin123"
            });

        expect(adminRegisterResponse.statusCode).toBe(201);


        // Change role to admin
        await db.promise().query(
            "UPDATE users SET role = 'admin' WHERE email = ?",
            [adminEmail]
        );


        const adminLoginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: adminEmail,
                password: "Admin123"
            });

        expect(adminLoginResponse.statusCode).toBe(200);

        adminToken = adminLoginResponse.body.token;
    });


    // =====================================================
    // ADD VEHICLE
    // =====================================================

    test("should reject adding vehicle without authentication", async () => {

        const response = await request(app)
            .post("/api/vehicles")
            .send({
                make: "Toyota",
                model: "Camry",
                category: "Sedan",
                price: 25000,
                quantity: 5
            });

        expect(response.statusCode).toBe(401);
    });


    test("should add a new vehicle with valid authentication", async () => {

        const response = await request(app)
            .post("/api/vehicles")
            .set("Authorization", `Bearer ${token}`)
            .send({
                make: "Toyota",
                model: "Camry",
                category: "Sedan",
                price: 25000,
                quantity: 5
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.message)
            .toBe("Vehicle added successfully");

        expect(response.body.vehicle)
            .toBeDefined();

        vehicleId = response.body.vehicle.id;
    });


    // =====================================================
    // GET VEHICLES
    // =====================================================

    test("should get all available vehicles", async () => {

        const response = await request(app)
            .get("/api/vehicles")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });


    // =====================================================
    // VALIDATION
    // =====================================================

    test("should reject vehicle creation with missing fields", async () => {

        const response = await request(app)
            .post("/api/vehicles")
            .set("Authorization", `Bearer ${token}`)
            .send({
                make: "Honda",
                model: "City"
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject vehicle creation with negative price", async () => {

        const response = await request(app)
            .post("/api/vehicles")
            .set("Authorization", `Bearer ${token}`)
            .send({
                make: "Honda",
                model: "City",
                category: "Sedan",
                price: -1000,
                quantity: 5
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject vehicle creation with negative quantity", async () => {

        const response = await request(app)
            .post("/api/vehicles")
            .set("Authorization", `Bearer ${token}`)
            .send({
                make: "Honda",
                model: "City",
                category: "Sedan",
                price: 20000,
                quantity: -5
            });

        expect(response.statusCode).toBe(400);
    });


    // =====================================================
    // SEARCH
    // =====================================================

    test("should search vehicles by make", async () => {

        const response = await request(app)
            .get("/api/vehicles/search?make=Toyota")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        expect(
            response.body.some(vehicle =>
                vehicle.make.toLowerCase() === "toyota"
            )
        ).toBe(true);
    });


    test("should search vehicles by model", async () => {

        const response = await request(app)
            .get("/api/vehicles/search?model=Camry")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        expect(
            response.body.some(vehicle =>
                vehicle.model.toLowerCase() === "camry"
            )
        ).toBe(true);
    });


    test("should search vehicles by category", async () => {

        const response = await request(app)
            .get("/api/vehicles/search?category=Sedan")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        expect(
            response.body.some(vehicle =>
                vehicle.category.toLowerCase() === "sedan"
            )
        ).toBe(true);
    });


    test("should search vehicles by maximum price", async () => {

        const response = await request(app)
            .get("/api/vehicles/search?maxPrice=30000")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        expect(
            response.body.every(vehicle =>
                Number(vehicle.price) <= 30000
            )
        ).toBe(true);
    });


    // =====================================================
    // UPDATE
    // =====================================================

    test("should update a vehicle", async () => {

        const response = await request(app)
            .put(`/api/vehicles/${vehicleId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                make: "Toyota",
                model: "Corolla",
                category: "Sedan",
                price: 28000,
                quantity: 10
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.message)
            .toBe("Vehicle updated successfully");
    });


    test("should reject updating vehicle without authentication", async () => {

        const response = await request(app)
            .put(`/api/vehicles/${vehicleId}`)
            .send({
                make: "Toyota",
                model: "Corolla",
                category: "Sedan",
                price: 28000,
                quantity: 10
            });

        expect(response.statusCode).toBe(401);
    });


    test("should reject update with invalid price", async () => {

        const response = await request(app)
            .put(`/api/vehicles/${vehicleId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                make: "Toyota",
                model: "Corolla",
                category: "Sedan",
                price: -500,
                quantity: 10
            });

        expect(response.statusCode).toBe(400);
    });


    test("should reject update with invalid quantity", async () => {

        const response = await request(app)
            .put(`/api/vehicles/${vehicleId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                make: "Toyota",
                model: "Corolla",
                category: "Sedan",
                price: 28000,
                quantity: -1
            });

        expect(response.statusCode).toBe(400);
    });


    // =====================================================
    // PURCHASE
    // =====================================================

    test("should create vehicle for purchase test", async () => {

        const response = await request(app)
            .post("/api/vehicles")
            .set("Authorization", `Bearer ${token}`)
            .send({
                make: "Honda",
                model: "Civic",
                category: "Sedan",
                price: 22000,
                quantity: 3
            });

        expect(response.statusCode).toBe(201);

        purchaseVehicleId =
            response.body.vehicle.id;
    });


    test("should purchase a vehicle and decrease quantity", async () => {

        const before = await db.promise().query(
            "SELECT quantity FROM vehicles WHERE id = ?",
            [purchaseVehicleId]
        );

        const oldQuantity = before[0][0].quantity;

        const response = await request(app)
            .post(`/api/vehicles/${purchaseVehicleId}/purchase`)
            .set("Authorization", `Bearer ${token}`)
            .send();

        expect(response.statusCode).toBe(200);

        expect(response.body.message)
            .toBe("Vehicle purchased successfully");

        expect(response.body.vehicle.quantity)
            .toBe(oldQuantity - 1);
    });


    test("should reject purchase without authentication", async () => {

        const response = await request(app)
            .post(`/api/vehicles/${purchaseVehicleId}/purchase`)
            .send();

        expect(response.statusCode).toBe(401);
    });


    test("should reject purchase when vehicle is out of stock", async () => {

        await db.promise().query(
            "UPDATE vehicles SET quantity = 0 WHERE id = ?",
            [purchaseVehicleId]
        );

        const response = await request(app)
            .post(`/api/vehicles/${purchaseVehicleId}/purchase`)
            .set("Authorization", `Bearer ${token}`)
            .send();

        expect(response.statusCode).toBe(400);

        expect(response.body.message)
            .toBe("Vehicle is out of stock");
    });
    // =====================================================
    // PURCHASE HISTORY
    // =====================================================

    test("should get purchase history for logged-in user", async () => {

        const response = await request(app)
            .get("/api/purchases")
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(200);

        expect(response.body.purchases)
            .toBeDefined();

        expect(Array.isArray(response.body.purchases))
            .toBe(true);
    });


    test("should reject purchase history without authentication", async () => {

        const response = await request(app)
            .get("/api/purchases");

        expect(response.statusCode).toBe(401);
    });

    // =====================================================
    // DELETE
    // =====================================================

    test("should create vehicle for delete test", async () => {

        const response = await request(app)
            .post("/api/vehicles")
            .set("Authorization", `Bearer ${token}`)
            .send({
                make: "Ford",
                model: "Focus",
                category: "Hatchback",
                price: 18000,
                quantity: 2
            });

        expect(response.statusCode).toBe(201);

        deleteVehicleId =
            response.body.vehicle.id;
    });


    test("should reject vehicle deletion by normal user", async () => {

        const response = await request(app)
            .delete(`/api/vehicles/${deleteVehicleId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.statusCode).toBe(403);
    });


    test("should reject vehicle deletion without authentication", async () => {

        const response = await request(app)
            .delete(`/api/vehicles/${deleteVehicleId}`);

        expect(response.statusCode).toBe(401);
    });


    test("should delete vehicle as admin", async () => {

        const response = await request(app)
            .delete(`/api/vehicles/${deleteVehicleId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);

        expect(response.body.message)
            .toBe("Vehicle deleted successfully");
    });


    // =====================================================
    // RESTOCK
    // =====================================================

    test("should restock vehicle as admin", async () => {

        const response = await request(app)
            .post(`/api/vehicles/${vehicleId}/restock`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                quantity: 5
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.message)
            .toBe("Vehicle restocked successfully");
    });


    test("should reject restock by normal user", async () => {

        const response = await request(app)
            .post(`/api/vehicles/${vehicleId}/restock`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                quantity: 5
            });

        expect(response.statusCode).toBe(403);
    });


    test("should reject restock without authentication", async () => {

        const response = await request(app)
            .post(`/api/vehicles/${vehicleId}/restock`)
            .send({
                quantity: 5
            });

        expect(response.statusCode).toBe(401);
    });


    test("should reject restock with invalid quantity", async () => {

        const response = await request(app)
            .post(`/api/vehicles/${vehicleId}/restock`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                quantity: -5
            });

        expect(response.statusCode).toBe(400);
    });


    afterAll((done) => {
        db.end(done);
    });

});