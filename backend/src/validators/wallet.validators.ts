import { z } from "zod";

export const pathPaymentQuoteSchema = z.object({
  sourceAmount: z
    .string()
    .min(1, "sourceAmount is required")
    .regex(/^\d+(\.\d+)?$/, "sourceAmount must be a valid number"),
  sourceAsset: z
    .string()
    .min(1, "sourceAsset is required")
    .max(12, "sourceAsset must be 12 characters or fewer"),
  sourceAssetIssuer: z
    .string()
    .max(56, "Invalid sourceAssetIssuer")
    .optional(),
});

export type PathPaymentQuoteInput = z.infer<typeof pathPaymentQuoteSchema>;
