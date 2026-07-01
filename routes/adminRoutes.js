import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import {
    getDashboardStats,
    listUsers,
    getUserByIdAdmin,
    setUserSuspension,
    setUserRole,
    listCouriers,
    getCourierByIdAdmin,
    setCourierVerification,
    listDeliveries,
    getDeliveryByIdAdmin,
    reassignDelivery,
    cancelDeliveryAdmin,
    getLiveLocations,
    listPayments,
    listRatings,
    deleteRating,
    exportDeliveriesCSV,
    getSupportConversations,
    getSupportMessages,
    sendSupportReply,
    setSupportStatus,
} from "../controllers/adminController.js";

const adminRouter = express.Router();

// All admin routes require auth + admin role
adminRouter.use(authMiddleware, adminMiddleware);

// Dashboard
adminRouter.get("/stats", getDashboardStats);

// Users
adminRouter.get("/users", listUsers);
adminRouter.get("/users/:id", getUserByIdAdmin);
adminRouter.patch("/users/:id/suspend", setUserSuspension);
adminRouter.patch("/users/:id/role", setUserRole);

// Couriers / Riders
adminRouter.get("/couriers", listCouriers);
adminRouter.get("/couriers/:id", getCourierByIdAdmin);
adminRouter.patch("/couriers/:id/verify", setCourierVerification);

// Deliveries / Orders
adminRouter.get("/deliveries", listDeliveries);
adminRouter.get("/deliveries/:id", getDeliveryByIdAdmin);
adminRouter.patch("/deliveries/:id/reassign", reassignDelivery);
adminRouter.patch("/deliveries/:id/cancel", cancelDeliveryAdmin);

// Live locations
adminRouter.get("/live-locations", getLiveLocations);

// Payments
adminRouter.get("/payments", listPayments);

// Ratings
adminRouter.get("/ratings", listRatings);
adminRouter.delete("/ratings/:id", deleteRating);

// CSV export
adminRouter.get("/export/deliveries", exportDeliveriesCSV);

// Support conversations (admin side)
adminRouter.get("/support/conversations", getSupportConversations);
adminRouter.get("/support/conversations/:id", getSupportMessages);
adminRouter.post("/support/conversations/:id/reply", sendSupportReply);
adminRouter.patch("/support/conversations/:id/status", setSupportStatus);

export default adminRouter;
