import rateLimit from "express-rate-limit";

export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes window
    max: 5,                    // limit each IP to 5 OTP requests
    message: {
        success: false,
        message: "Too many OTP requests. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});
