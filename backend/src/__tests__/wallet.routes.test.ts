import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { walletRoutes } from "../routes/wallet.routes";
import { WalletService } from "../services/wallet.service";
import { PathPaymentService } from "../services/pathPayment.service";

jest.mock("../services/wallet.service");
jest.mock("../services/pathPayment.service");

const TEST_SECRET = "test_secret_for_wallet_tests";
const VALID_ADDRESS = "GAAPMSLVTKJURQGMDFQEHAJK7AGEHBXY4X3SIBE6LQACVW5Z2LE3KUS6";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
process.env.JWT_SECRET = TEST_SECRET;

const app = express();
app.use(express.json());
app.use("/wallet", walletRoutes);

afterAll(() => {
  process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
});

describe("Wallet Routes", () => {
  let token: string;

  beforeAll(() => {
    token = jwt.sign({ walletAddress: VALID_ADDRESS }, TEST_SECRET);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /wallet/balance", () => {
    it("returns USDC amount for valid address with auth", async () => {
      const mockBalance = "150.50";
      (WalletService.prototype.getUsdcBalance as jest.Mock).mockResolvedValue(mockBalance);

      const res = await request(app)
        .get("/wallet/balance")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        balance: mockBalance,
        asset: "USDC",
      });
      expect(WalletService.prototype.getUsdcBalance).toHaveBeenCalledWith(
        VALID_ADDRESS.toLowerCase()
      );
    });

    it("returns 401 without token", async () => {
      const res = await request(app).get("/wallet/balance");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    it("returns 401 for invalid token format", async () => {
      const res = await request(app)
        .get("/wallet/balance")
        .set("Authorization", "InvalidTokenFormat");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    it("returns 401 for token with invalid address format", async () => {
      const badToken = jwt.sign(
        { walletAddress: "not-a-valid-stellar-address" },
        TEST_SECRET
      );

      const res = await request(app)
        .get("/wallet/balance")
        .set("Authorization", `Bearer ${badToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid token payload");
    });

    it("returns 401 for token missing walletAddress", async () => {
      const badToken = jwt.sign({ foo: "bar" }, TEST_SECRET);

      const res = await request(app)
        .get("/wallet/balance")
        .set("Authorization", `Bearer ${badToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid token payload");
    });
  });

  describe("GET /wallet/path-payment-quote", () => {
    it("returns routes array", async () => {
      const mockQuotes = [
        {
          source_amount: "1000",
          source_asset_type: "native",
          source_asset_code: "NGN",
          destination_amount: "1",
          destination_asset_type: "credit_alphanum4",
          destination_asset_code: "USDC",
          path: [],
        },
      ];

      (PathPaymentService.prototype.getPathPaymentQuote as jest.Mock).mockResolvedValue(mockQuotes);

      const res = await request(app).get("/wallet/path-payment-quote").query({
        sourceAmount: "1000",
        sourceAsset: "NGN",
      });

      expect(res.status).toBe(200);
      expect(res.body.routes).toEqual(mockQuotes);
      expect(PathPaymentService.prototype.getPathPaymentQuote).toHaveBeenCalledWith(
        "1000",
        "NGN",
        undefined
      );
    });

    it("returns 400 without required query parameters", async () => {
      const res = await request(app).get("/wallet/path-payment-quote");
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 for invalid sourceAmount", async () => {
      const res = await request(app).get("/wallet/path-payment-quote").query({
        sourceAmount: "not-a-number",
        sourceAsset: "NGN",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 for empty sourceAmount", async () => {
      const res = await request(app).get("/wallet/path-payment-quote").query({
        sourceAmount: "",
        sourceAsset: "NGN",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 for invalid sourceAssetIssuer address", async () => {
      const res = await request(app).get("/wallet/path-payment-quote").query({
        sourceAmount: "1000",
        sourceAsset: "USDC",
        sourceAssetIssuer: "not-a-valid-address",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid sourceAssetIssuer address");
    });
  });
});
