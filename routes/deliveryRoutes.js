import express from "express";
import {
  createDelivery,
  acceptDelivery,
  pickupDelivery,
  completeDelivery,
  confirmDelivery,
  getMyDeliveries,
} from "../controllers/deliveryController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const deliveryRouter = express.Router();

// Customer creates a new delivery order
deliveryRouter.post("/", authMiddleware, createDelivery);

// Courier accepts an order
deliveryRouter.patch("/:id/accept", authMiddleware, acceptDelivery);

// Courier confirms pickup
deliveryRouter.patch("/:id/pickup", authMiddleware, pickupDelivery);

// Courier completes delivery
deliveryRouter.patch("/:id/complete", authMiddleware, completeDelivery);

// Customer confirms delivery
deliveryRouter.patch("/:id/confirm", authMiddleware, confirmDelivery);

// Fetch customer's deliveries
deliveryRouter.get("/my-orders", authMiddleware, getMyDeliveries);


export default deliveryRouter;
