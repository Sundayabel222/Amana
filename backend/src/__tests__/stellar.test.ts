import { isValidStellarAddress, normalizeAddress, validateAndNormalizeAddress } from "../lib/stellar";

const VALID_ADDRESS = "GAAPMSLVTKJURQGMDFQEHAJK7AGEHBXY4X3SIBE6LQACVW5Z2LE3KUS6";

describe("Stellar address validation", () => {
  describe("isValidStellarAddress", () => {
    it("returns true for a valid Stellar public key", () => {
      expect(isValidStellarAddress(VALID_ADDRESS)).toBe(true);
    });

    it("returns false for an empty string", () => {
      expect(isValidStellarAddress("")).toBe(false);
    });

    it("returns false for null", () => {
      expect(isValidStellarAddress(null as unknown as string)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isValidStellarAddress(undefined as unknown as string)).toBe(false);
    });

    it("returns false for a random string", () => {
      expect(isValidStellarAddress("not-a-valid-address")).toBe(false);
    });

    it("returns false for a short string", () => {
      expect(isValidStellarAddress("G123")).toBe(false);
    });

    it("returns false for a number", () => {
      expect(isValidStellarAddress(12345 as unknown as string)).toBe(false);
    });

    it("returns false for a valid Stellar address in lowercase (base32 is case-sensitive)", () => {
      expect(isValidStellarAddress(VALID_ADDRESS.toLowerCase())).toBe(false);
    });
  });

  describe("normalizeAddress", () => {
    it("lowercases and trims an address", () => {
      expect(normalizeAddress("  ABC  ")).toBe("abc");
    });
  });

  describe("validateAndNormalizeAddress", () => {
    it("returns normalized address for valid input", () => {
      const result = validateAndNormalizeAddress(VALID_ADDRESS);
      expect(result).toBe(VALID_ADDRESS.toLowerCase());
    });

    it("returns null for invalid input", () => {
      expect(validateAndNormalizeAddress("bad")).toBeNull();
    });
  });
});
