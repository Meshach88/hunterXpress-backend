import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,  // 5 minutes window
    max: 5,                    // limit each IP to 5 login attempts
    message: {
        success: false,
        message: "Too many login attempts. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});