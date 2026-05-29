import { supabase } from "../lib/supabase";
import { UpdateProfileInput } from "../validators/user.validators";
import { isValidStellarAddress } from "../lib/stellar";

class UserInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserInputError";
  }
}

async function findUserByAddress(address: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("address", address)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findOrCreateUser(address: string) {
  if (!isValidStellarAddress(address)) {
    throw new UserInputError("Invalid wallet address");
  }

  const existing = await findUserByAddress(address);
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("users")
    .insert({ address })
    .select()
    .single();

  if (createError) throw createError;
  return created;
}

export async function updateUser(address: string, input: UpdateProfileInput) {
  if (!isValidStellarAddress(address)) {
    throw new UserInputError("Invalid wallet address");
  }

  const { data, error } = await supabase
    .from("users")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("address", address)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPublicProfile(address: string) {
  if (!isValidStellarAddress(address)) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("address, display_name, avatar_url, created_at")
    .eq("address", address)
    .maybeSingle();

  if (error) throw error;
  return data;
}
