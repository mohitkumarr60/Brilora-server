"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("../controllers/payment controller");
const paymentRouter = express_1.default.Router();
paymentRouter.post('/create-payment', payment_controller_1.paymentInstance);
paymentRouter.post('/payment-verify', payment_controller_1.paymentVerification);
paymentRouter.get('/get-key', payment_controller_1.getKey);
exports.default = paymentRouter;
