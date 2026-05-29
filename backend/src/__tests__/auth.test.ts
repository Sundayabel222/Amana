import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth";

const TEST_SECRET = "test_secret_for_auth_tests";
const VALID_ADDRESS = "GAAPMSLVTKJURQGMDFQEHAJK7AGEHBXY4X3SIBE6LQACVW5Z2LE3KUS6";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
process.env.JWT_SECRET = TEST_SECRET;

const app = express();
app.get("/protected", requireAuth, (req: any, res) => {
  res.json({ address: req.userAddress });
});

afterAll(() => {
  process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
});

describe("requireAuth middleware", () => {
  it("returns 401 without Authorization header", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 401 without Bearer prefix", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Token abc123");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 200 with valid token", async () => {
    const token = jwt.sign({ address: VALID_ADDRESS }, TEST_SECRET);
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.address).toBe(VALID_ADDRESS.toLowerCase());
  });

  it("returns 401 with an invalid signature", async () => {
    const token = jwt.sign({ address: VALID_ADDRESS }, "wrong_secret");
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid token");
  });

  it("returns 401 with non-Stellar address in token", async () => {
    const token = jwt.sign({ address: "not-a-valid-address" }, TEST_SECRET);
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid token payload");
  });

  it("returns 401 with missing address in token", async () => {
    const token = jwt.sign({ foo: "bar" }, TEST_SECRET);
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid token payload");
  });
});
