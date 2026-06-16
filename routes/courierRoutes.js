import express from "express";
import { goOnline, goOffline, getCourierData, updateLocation, updateCourierProfile } from "../controllers/courierController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const courierRouter = express.Router();

courierRouter.get("/", authMiddleware, getCourierData);
courierRouter.post("/go-online", authMiddleware, goOnline);
courierRouter.post("/go-offline", authMiddleware, goOffline);
courierRouter.patch("/location", authMiddleware, updateLocation);
courierRouter.patch("/profile",
    authMiddleware,
    upload.fields([
        { name: "validId", maxCount: 1 },
        { name: "proofOfAddress", maxCount: 1 },
    ]),
    updateCourierProfile);

export default courierRouter;