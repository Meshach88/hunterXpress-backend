import jwt from 'jsonwebtoken';
import 'dotenv/config';

const generateToken = (payload, options = {}) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h", ...options });
}

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
}

const generateAccessToken = (payload, options = {}) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1h", ...options });
}

const generateRefreshToken = (payload, options = {}) => {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d", ...options });
}

const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
}


export { generateToken, verifyToken, generateAccessToken, generateRefreshToken, verifyRefreshToken };