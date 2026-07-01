import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
    startConversation,
    sendCustomerMessage,
    getMyConversation,
} from "../controllers/supportController.js";

const supportRouter = express.Router();

// All routes require auth (customer must be logged in)
supportRouter.use(authMiddleware);

supportRouter.post("/start", startConversation);
supportRouter.get("/mine", getMyConversation);
supportRouter.post("/:id/message", sendCustomerMessage);

export default supportRouter;
