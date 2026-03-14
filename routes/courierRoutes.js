import express from "express";
import { goOnline, goOffline } from "../controllers/courierController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const courierRouter = express.Router();

courierRouter.post("/go-online", authMiddleware, goOnline);
courierRouter.post("/go-offline", authMiddleware, goOffline);

export default courierRouter;