import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../middleware/auth.middleware";
import { WalletService } from "../services/wallet.service";
import { PathPaymentService } from "../services/pathPayment.service";
import { pathPaymentQuoteSchema } from "../validators/wallet.validators";
import { isValidStellarAddress } from "../lib/stellar";

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const walletRoutes = Router();
const walletService = new WalletService();
const pathPaymentService = new PathPaymentService();

walletRoutes.get("/balance", authMiddleware, async (req, res) => {
  try {
    const walletAddress = (req as any).user?.walletAddress;
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address not found in token" });
    }
    const balance = await walletService.getUsdcBalance(walletAddress);
    res.json({ balance, asset: "USDC" });
  } catch (error) {
    console.error("Balance fetch error:", error);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

walletRoutes.get("/path-payment-quote", publicLimiter, async (req, res) => {
  try {
    const parsed = pathPaymentQuoteSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const { sourceAmount, sourceAsset, sourceAssetIssuer } = parsed.data;

    if (sourceAssetIssuer && !isValidStellarAddress(sourceAssetIssuer)) {
      return res.status(400).json({ error: "Invalid sourceAssetIssuer address" });
    }

    const quotes = await pathPaymentService.getPathPaymentQuote(
      sourceAmount,
      sourceAsset,
      sourceAssetIssuer
    );
    res.json({ routes: quotes });
  } catch (error) {
    console.error("Path payment quote error:", error);
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});
