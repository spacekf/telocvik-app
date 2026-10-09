import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Zahashuje heslo pomocí bcrypt. Nikdy neukládáme plaintext. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Ověří heslo proti uloženému hashi. */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
