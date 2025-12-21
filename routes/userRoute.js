import express from 'express';
import { register, login, profile, sendOtp, verifyOtp, resendOtp } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import upload from "../middleware/upload.js";
import { loginLimiter } from '../middleware/loginLimiter.js';

const userRouter = express.Router();

userRouter.post('/register',
    upload.fields([
        { name: "validId", maxCount: 1 },
        { name: "proofOfAddress", maxCount: 1 },
    ]),
    register);
userRouter.post('/sendOtp', sendOtp);
userRouter.post('/verifyOtp', verifyOtp);
userRouter.post('/resendOtp', resendOtp);
userRouter.post('/login', loginLimiter, login);
userRouter.get('/profile', authMiddleware, profile)

export default userRouter;



