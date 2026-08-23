# Test Report

## Test Framework

- Jest
- Supertest

## Test Command

```powershell
cd backend
npm test
```

## Test Result

```text
Test Suites: 2 passed, 2 total
Tests:       85 passed, 85 total
Snapshots:   0 total
```

## Result

**All 85 tests passed successfully.**

## Test Coverage Areas

The test suite covers:

- User registration and login
- Authentication
- JWT-based authorization
- Vehicle creation
- Vehicle listing
- Vehicle search
- Vehicle filtering
- Vehicle updates
- Vehicle deletion
- Admin authorization
- Vehicle purchasing
- Stock quantity reduction after purchase
- Out-of-stock purchase handling
- Vehicle restocking
- Purchase history
- Unauthorized purchase-history access

## Test Suites

### Authentication Tests

The authentication test suite verifies:

- User registration
- User login
- Authentication validation
- Invalid credentials
- Protected endpoint access

### Vehicle Tests

The vehicle test suite verifies:

- Adding vehicles
- Getting vehicles
- Searching vehicles
- Updating vehicles
- Deleting vehicles
- Admin-only operations
- Purchasing vehicles
- Stock reduction
- Out-of-stock handling
- Restocking
- Purchase history
- Authentication requirements

## Final Status

**PASS — 85/85 tests passed**

The final backend test suite completed successfully with all test suites passing.