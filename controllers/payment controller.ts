require('dotenv').config();
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import CourseModel from "../models/course.model";
import userModel from "../models/user.model";
import { instance } from "../server";

export const getKey = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ key: process.env.RAZORPAY_API_KEY });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
})

export const paymentInstance = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.body.courseId;
    const user = await userModel.findById(req.user?._id);
    const course = await CourseModel.findById(courseId);

    if (!course) return next(new ErrorHandler("Course not found", 404));

    if (course) {
      if (course.price === 0) {
        user?.courses.push(course?._id);
      }

      if (course.price !== 0) {
        const options = {
          amount: Number(course.price * 100),
          currency: "INR",
          receipt: crypto.randomBytes(10).toString("hex"),
        };

        const order = await instance.orders.create(options);

        res.status(200).json({
          success: true,
          order
        });
      }
    }

  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

export const paymentVerification = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto.createHmac("sha256", process.env.KEY_SECRET as any).update(sign.toString()).digest("hex");

    if (razorpay_signature === expectedSign) {
      res.status(200).json({ message: "Payment verified successfully" });
    } else {
      res.status(400).json({ message: "Payment verification failed" });
    }
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});