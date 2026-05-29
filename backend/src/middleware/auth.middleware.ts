import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { isValidStellarAddress } from "../lib/stellar";

export interface AuthRequest extends Request {
  user?: {
    walletAddress: string;
    [key: string]: unknown;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "default_secret";

    try {
      const decoded = jwt.verify(token, secret) as { walletAddress?: string; [key: string]: unknown };

      if (!decoded.walletAddress || !isValidStellarAddress(decoded.walletAddress)) {
        return res.status(401).json({ error: "Invalid token payload" });
      }

      decoded.walletAddress = decoded.walletAddress.toLowerCase();
      req.user = decoded as { walletAddress: string; [key: string]: unknown };
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
