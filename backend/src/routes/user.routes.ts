import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import { getMe, updateMe, getUserByAddress } from "../controllers/user.controller";

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.use(authLimiter);

router.get("/me", requireAuth, getMe);
router.put("/me", requireAuth, updateMe);
router.get("/:address", publicLimiter, getUserByAddress);

export default router;
