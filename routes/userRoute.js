import express from 'express';
import { register, login, profile, updateProfilePicture, sendOtp, verifyOtp, resendOtp, forgotPassword, resetPassword, changePassword, refreshAccessToken, logout, requestPasswordResetOtp, confirmPasswordResetWithOtp } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import upload from "../middleware/upload.js";
import { loginLimiter } from '../middleware/loginLimiter.js';
import { otpLimiter } from '../middleware/otpLimiter.js';

const userRouter = express.Router();

userRouter.post('/register',
    upload.fields([
        { name: "validId", maxCount: 1 },
        { name: "proofOfAddress", maxCount: 1 },
    ]),
    register);
userRouter.post('/sendOtp', otpLimiter, sendOtp);
userRouter.post('/verifyOtp', verifyOtp);
userRouter.post('/resendOtp', otpLimiter, resendOtp);
userRouter.post('/login', loginLimiter, login);
userRouter.post('/refresh', refreshAccessToken);
userRouter.post('/logout', authMiddleware, logout);
userRouter.get('/profile', authMiddleware, profile)
userRouter.patch('/profile/picture', authMiddleware, updateProfilePicture)
userRouter.post('/forgotPassword', forgotPassword);
userRouter.post('/resetPassword', resetPassword);
userRouter.post('/changePassword', authMiddleware, changePassword);
userRouter.post('/mobile/requestPasswordReset', otpLimiter, requestPasswordResetOtp);
userRouter.post('/mobile/confirmPasswordReset', confirmPasswordResetWithOtp);

export default userRouter;



