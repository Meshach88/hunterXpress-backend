import express from "express";
import { initializePayment, verifyPayment } from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const paymentRouter = express.Router();

paymentRouter.post("/initialize", authMiddleware, initializePayment);
paymentRouter.get("/verify", verifyPayment);

export default paymentRouter;
