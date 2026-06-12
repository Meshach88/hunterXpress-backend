import express from 'express';
import { connectDB } from './config/db.js';
import userRouter from './routes/userRoute.js';
import deliveryRouter from "./routes/deliveryRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import cors from 'cors';
import 'dotenv/config';
import courierRouter from './routes/courierRoutes.js';
import dispatchRouter from './routes/dispatchRouter.js';
import cron from 'node-cron';
import { cleanupInactiveCouriers } from './jobs/courierCleanupJob.js';


const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PATCH", "DELETE"],
}));
app.use(express.json());

// DB connection
connectDB();

// Routes
app.use('/api/user', userRouter);
app.use('/api/courier', courierRouter);
app.use('/api/dispatch', dispatchRouter);
app.use("/api/deliveries", deliveryRouter);
app.use("/api/payment", paymentRoutes);

app.get('/', (req, res) => {
    res.send('API working');
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: "Internal server error" });
});

// Mark couriers offline if they haven't sent a location update recently
// cron.schedule("* * * * *", () => {
//     cleanupInactiveCouriers();
// });

// Start server
app.listen(port, () => {
    console.log(`Server (API) running on port ${port}`);
});