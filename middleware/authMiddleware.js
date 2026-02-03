import { verifyToken } from "../services/jwtService.js";

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) return res.json({ success: false, message: "Malformed token" });

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Invalid or expired token" });
    }
};

export { authMiddleware };