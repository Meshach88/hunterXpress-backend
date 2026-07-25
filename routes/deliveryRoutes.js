import express from "express";
import {
  createDelivery,
  acceptDelivery,
  rejectDelivery,
  pickupDelivery,
  completeDelivery,
  confirmDelivery,
  cancelDelivery,
  getMyDeliveries,
  getMyCourierDeliveries,
  getDeliveryById,
  dispatchOrder,
} from "../controllers/deliveryController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const deliveryRouter = express.Router();

// Customer creates a new delivery order
deliveryRouter.post("/", authMiddleware, createDelivery);

//Dispatch order/deliveries to couriers
deliveryRouter.post("/dispatch", authMiddleware, dispatchOrder);

// Courier accepts an order
deliveryRouter.patch("/:id/accept", authMiddleware, acceptDelivery);

// Courier rejects an assigned order (reassigns to next nearest courier)
deliveryRouter.patch("/:id/reject", authMiddleware, rejectDelivery);

// Courier confirms pickup
deliveryRouter.patch("/:id/pickup", authMiddleware, pickupDelivery);

// Courier completes delivery
deliveryRouter.patch("/:id/complete", authMiddleware, completeDelivery);

// Customer confirms delivery
deliveryRouter.patch("/:id/confirm", authMiddleware, confirmDelivery);

// Customer cancels an order
deliveryRouter.patch("/:id/cancel", authMiddleware, cancelDelivery);

// Fetch customer's deliveries
deliveryRouter.get("/my-orders", authMiddleware, getMyDeliveries);

// Fetch courier's deliveries
deliveryRouter.get("/my-deliveries", authMiddleware, getMyCourierDeliveries);

// Fetch a single delivery by id
deliveryRouter.get("/:id", authMiddleware, getDeliveryById);


export default deliveryRouter;
