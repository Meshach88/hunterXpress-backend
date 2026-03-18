import express from 'express'
import { findNearbyCouriers } from '../controllers/dispatchController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const dispatchRouter = express.Router()

dispatchRouter.post("/nearby-couriers", authMiddleware, findNearbyCouriers);

export default dispatchRouter;