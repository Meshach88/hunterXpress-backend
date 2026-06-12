import express from "express";
import { goOnline, goOffline, getCourierData, updateLocation } from "../controllers/courierController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const courierRouter = express.Router();

courierRouter.get("/", authMiddleware, getCourierData);
courierRouter.post("/go-online", authMiddleware, goOnline);
courierRouter.post("/go-offline", authMiddleware, goOffline);
courierRouter.patch("/location", authMiddleware, updateLocation);

export default courierRouter;