import { Request, Response, NextFunction } from "express";
import { decrypt, encrypt } from "../shared/encryption";

export const encryptionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip encryption for specific paths or methods if needed
  // e.g., if (req.path.startsWith('/public')) return next();

  // Decrypt Request Body
  if (req.body && req.body.data && typeof req.body.data === "string") {
    const decrypted = decrypt(req.body.data);
    if (decrypted) {
      req.body = decrypted;
    }
  }

  // Intercept Response to Encrypt Body
  const originalJson = res.json;
  res.json = function (body: any): Response {
    // Check if body is already encrypted or shouldn't be encrypted
    // For simplicity, we encrypt everything that is an object/array
    // We wrap it in { data: "encrypted_string" }

    if (body && typeof body === "object") {
      // Avoid double encryption if already encrypted (though unlikely with this logic)
      if (
        body.data &&
        Object.keys(body).length === 1 &&
        typeof body.data === "string"
      ) {
        return originalJson.call(this, body);
      }

      const encrypted = encrypt(body);
      return originalJson.call(this, { data: encrypted });
    }

    return originalJson.call(this, body);
  };

  next();
};
