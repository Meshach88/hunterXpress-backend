import express from 'express';
import { connectDB } from './config/db.js';
import userRouter from './routes/userRoute.js';
import deliveryRouter from "./routes/deliveryRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import cors from 'cors';
import 'dotenv/config';
import { Server } from 'socket.io';
import http from 'http';
import Courier from './models/Courier.js';
import { verifyToken } from './services/jwtService.js';
import courierRouter from './routes/courierRoutes.js';
import { courierSocketHandler } from "./sockets/courierSocket.js";
import dispatchRouter from './routes/dispatchRouter.js';
import cron from 'node-cron';
import { cleanupInactiveCouriers } from './jobs/courierCleanupJob.js';
import { customerSocketHandler } from './sockets/customerSockets.js';


const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
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

// HTTP + WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // origin: [process.env.FRONTEND_URL],
        origin: "*",
        methods: ["GET", "POST"],
    },
});

io.of("/courier").on("connection", (socket) => {
    courierSocketHandler(io, socket);
});

io.of("/customer").on("connection", (socket) => {
    customerSocketHandler(io, socket);
});


export { io };

// cron.schedule("* * * * *", () => {
//     cleanupInactiveCouriers();
// });


// io.use((socket, next) => {
//     const token = socket.handshake.auth.token;
//     if (!token) {
//         console.log("No token provided");
//         return next(new Error("Unauthorized"));
//     }
//     try {
//         const decoded = verifyToken(token)
//         socket.user = decoded
//         next()
//     } catch (err) {
//         console.log("Invalid token:", err.message);
//         next(new Error("Unauthorized"));
//     }
// });

// Socket.io logic
// io.on("connection", (socket) => {
//     console.log("Client connected:", socket.id);

//     socket.on("location_update", async (data) => {
//         const { courierId, lat, lng } = data;
//         if (!courierId || !lat || !lng) return;

//         try {
//             await Courier.findOneAndUpdate(
//                 { user_id: courierId },
//                 {
//                     $set: {
//                         last_known_location: {
//                             lat,
//                             lng,
//                             last_updated: new Date(),
//                         },
//                     },
//                 },
//                 { new: true }
//             );

//             io.emit("courier_location_update", {
//                 courierId,
//                 lat,
//                 lng,
//                 updatedAt: new Date(),
//             });
//         } catch (error) {
//             console.error("Location update error:", error);
//         }
//     });

//     socket.on("disconnect", () => {
//         console.log("Client disconnected:", socket.id);
//     });
// });

// Start combined server
server.listen(port, () => {
    console.log(`Server (API + Socket.io) running on port ${port}`);
});