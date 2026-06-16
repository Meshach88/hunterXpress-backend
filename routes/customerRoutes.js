import express from "express";
import { getCustomerData, updateCustomerProfile } from "../controllers/customerController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const customerRouter = express.Router();

customerRouter.get("/", authMiddleware, getCustomerData);
customerRouter.patch("/profile", authMiddleware, updateCustomerProfile);

export default customerRouter;
