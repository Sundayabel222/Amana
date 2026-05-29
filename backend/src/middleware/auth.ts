import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { isValidStellarAddress } from "../lib/stellar";

export interface AuthRequest extends Request {
  userAddress?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const token = header.slice(7);
    const secret = process.env.JWT_SECRET || "default_secret";
    const payload = jwt.verify(token, secret) as { address: string };

    if (!payload.address || !isValidStellarAddress(payload.address)) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }

    req.userAddress = payload.address.toLowerCase();
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
