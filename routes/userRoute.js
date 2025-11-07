import express from 'express';
import { register, login, profile } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const userRouter = express.Router();

userRouter.post('/register', register);
userRouter.post('/login', login);
userRouter.get('/profile', authMiddleware, profile)

export default userRouter;



