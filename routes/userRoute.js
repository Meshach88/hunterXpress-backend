import express from 'express';
import { register, login, profile, sendOtp, verifyOtp, resendOtp } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const userRouter = express.Router();

userRouter.post('/register', register);
userRouter.post('/sendOtp', sendOtp);
userRouter.post('/verifyOtp', verifyOtp);
userRouter.post('/resendOtp', resendOtp);
userRouter.post('/login', login);
userRouter.get('/profile', authMiddleware, profile)

export default userRouter;



