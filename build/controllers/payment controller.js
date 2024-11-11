"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentVerification = exports.paymentInstance = exports.getKey = void 0;
require('dotenv').config();
const crypto_1 = __importDefault(require("crypto"));
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const course_model_1 = __importDefault(require("../models/course.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const server_1 = require("../server");
exports.getKey = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        res.status(200).json({ key: process.env.RAZORPAY_API_KEY });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.paymentInstance = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const courseId = req.body.courseId;
        const user = await user_model_1.default.findById(req.user?._id);
        const course = await course_model_1.default.findById(courseId);
        if (!course)
            return next(new ErrorHandler_1.default("Course not found", 404));
        if (course) {
            if (course.price === 0) {
                user?.courses.push(course?._id);
            }
            if (course.price !== 0) {
                const options = {
                    amount: Number(course.price * 100),
                    currency: "INR",
                    receipt: crypto_1.default.randomBytes(10).toString("hex"),
                };
                const order = await server_1.instance.orders.create(options);
                res.status(200).json({
                    success: true,
                    order
                });
            }
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
});
exports.paymentVerification = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto_1.default.createHmac("sha256", process.env.KEY_SECRET).update(sign.toString()).digest("hex");
        if (razorpay_signature === expectedSign) {
            res.status(200).json({ message: "Payment verified successfully" });
        }
        else {
            res.status(400).json({ message: "Payment verification failed" });
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
});
