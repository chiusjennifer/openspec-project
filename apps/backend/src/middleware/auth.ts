import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/auth.js";
import type { RoleName } from "../types/domain.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roleName: RoleName;
        mustResetPassword: boolean;
      };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

export function requireRole(...roles: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.roleName)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
}
