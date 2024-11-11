import express from "express";
import { getKey, paymentInstance, paymentVerification } from "../controllers/payment controller";

const paymentRouter = express.Router();

paymentRouter.post('/create-payment', paymentInstance);

paymentRouter.post('/payment-verify', paymentVerification);

paymentRouter.get('/get-key', getKey);

export default paymentRouter;