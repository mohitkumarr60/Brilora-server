import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import { generateLast12MonthsData } from "../utils/analytics.generator";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import OrderModel from "../models/order.Model";

// get users analytics --only for admin
export const getUsersAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await generateLast12MonthsData(userModel);

        res.status(200).json({
            success: true,
            users,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

// get courses analytics --only for admin
export const getCoursesAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courses = await generateLast12MonthsData(CourseModel);

        res.status(200).json({
            success: true,
            courses,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

// get order analytics --only for admin
export const getOrdersAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orders = await generateLast12MonthsData(OrderModel);

        res.status(200).json({
            success: true,
            orders,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

//get total users --only for admin
export const getTotalUsers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await userModel.countDocuments();

        res.status(200).json({
            users,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

//get total orders --only for admin
export const getTotalOrders = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orders = await OrderModel.countDocuments();

        res.status(200).json({
            orders,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});