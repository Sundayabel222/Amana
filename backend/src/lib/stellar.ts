import { StrKey } from "@stellar/stellar-sdk";

export function isValidStellarAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  return StrKey.isValidEd25519PublicKey(address);
}

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function validateAndNormalizeAddress(address: string): string | null {
  if (!isValidStellarAddress(address)) return null;
  return normalizeAddress(address);
}
