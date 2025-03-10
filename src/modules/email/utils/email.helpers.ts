import jwt from "jsonwebtoken";

interface TokenPayload {
  email: string;
  action: "verify" | "reset" | string;
  [key: string]: any;
}

export const generateToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET || "your-default-secret";
  const expiresIn = process.env.TOKEN_EXPIRY || "24h";

  return jwt.sign(payload, secret as any, { expiresIn: expiresIn as any });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const secret = process.env.JWT_SECRET || "your-default-secret";
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};
