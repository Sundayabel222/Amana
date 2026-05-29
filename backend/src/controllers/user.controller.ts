import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { findOrCreateUser, updateUser, getPublicProfile } from "../services/user.service";
import { updateProfileSchema } from "../validators/user.validators";
import { isValidStellarAddress } from "../lib/stellar";

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.userAddress) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await findOrCreateUser(req.userAddress);
    res.json(user);
  } catch (err) {
    console.error("Failed to fetch profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
}

export async function updateMe(req: AuthRequest, res: Response) {
  if (!req.userAddress) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  try {
    const user = await updateUser(req.userAddress, parsed.data);
    res.json(user);
  } catch (err) {
    console.error("Failed to update profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
}

export async function getUserByAddress(req: AuthRequest, res: Response) {
  const rawAddress = req.params.address;
  const address = typeof rawAddress === "string" ? rawAddress : "";

  if (!address || !isValidStellarAddress(address)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  try {
    const user = await getPublicProfile(address.toLowerCase());
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error("Failed to fetch profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
}
