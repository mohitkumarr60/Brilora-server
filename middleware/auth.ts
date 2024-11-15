import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import redis from "../utils/redis";
import { updateAccessToken } from "../controllers/user.controller";

//authenticated user
export const isAuthenticated = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.cookies.access_token as string;

    if (!accessToken) {
        return updateAccessToken(req, res, next);
    }

    try {
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN as string) as JwtPayload;

        const user = await redis.get(decoded.id);

        if (!user) {
            return next(new ErrorHandler("User not found, please login again.", 401));
        }

        req.user = JSON.parse(user);
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return updateAccessToken(req, res, next);
        }
        next(new ErrorHandler("Invalid access token", 401));
    }
});

//validate user role
export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user?.role || '')) {
            return next(new ErrorHandler(`Role: (${req.user?.role}) is not allowed to access this resource`, 403));
        }
        next();
    };
}