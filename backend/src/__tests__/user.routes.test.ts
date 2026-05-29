import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

jest.mock("../lib/supabase", () => ({
  supabase: {},
}));

import userRoutes from "../routes/user.routes";
import * as userService from "../services/user.service";

jest.mock("../services/user.service");

const TEST_SECRET = "test_secret_for_user_tests";
const VALID_ADDRESS = "GAAPMSLVTKJURQGMDFQEHAJK7AGEHBXY4X3SIBE6LQACVW5Z2LE3KUS6";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
process.env.JWT_SECRET = TEST_SECRET;

const app = express();
app.use(express.json());
app.use("/users", userRoutes);

afterAll(() => {
  process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
});

describe("User Routes", () => {
  let token: string;

  beforeAll(() => {
    token = jwt.sign({ address: VALID_ADDRESS }, TEST_SECRET);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /users/me", () => {
    it("returns user profile for authenticated request", async () => {
      const mockUser = { address: VALID_ADDRESS.toLowerCase(), display_name: "Test" };
      (userService.findOrCreateUser as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockUser);
      expect(userService.findOrCreateUser).toHaveBeenCalledWith(
        VALID_ADDRESS.toLowerCase()
      );
    });

    it("returns 401 without token", async () => {
      const res = await request(app).get("/users/me");
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /users/me", () => {
    it("updates profile with valid data", async () => {
      const updatedUser = {
        address: VALID_ADDRESS.toLowerCase(),
        display_name: "NewName",
      };
      (userService.updateUser as jest.Mock).mockResolvedValue(updatedUser);

      const res = await request(app)
        .put("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ displayName: "NewName" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedUser);
    });

    it("returns 400 for short displayName", async () => {
      const res = await request(app)
        .put("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ displayName: "X" });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid displayName characters", async () => {
      const res = await request(app)
        .put("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ displayName: "<script>alert(1)</script>" });

      expect(res.status).toBe(400);
    });

    it("returns 400 for empty update body", async () => {
      const res = await request(app)
        .put("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("No valid fields to update");
    });

    it("returns 400 for invalid avatarUrl", async () => {
      const res = await request(app)
        .put("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ avatarUrl: "not-a-url" });

      expect(res.status).toBe(400);
    });

    it("returns 401 without token", async () => {
      const res = await request(app)
        .put("/users/me")
        .send({ displayName: "ValidName" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /users/:address", () => {
    it("returns public profile for valid address", async () => {
      const mockProfile = {
        address: VALID_ADDRESS.toLowerCase(),
        display_name: "Public User",
        avatar_url: null,
        created_at: "2024-01-01T00:00:00Z",
      };
      (userService.getPublicProfile as jest.Mock).mockResolvedValue(mockProfile);

      const res = await request(app).get(`/users/${VALID_ADDRESS}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockProfile);
    });

    it("returns 400 for invalid address format", async () => {
      const res = await request(app).get("/users/not-valid");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid wallet address");
    });

    it("returns 404 for non-existent address", async () => {
      (userService.getPublicProfile as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get(`/users/${VALID_ADDRESS}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("User not found");
    });
  });
});
