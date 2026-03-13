import jwt from 'jsonwebtoken';
import 'dotenv/config';

const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" })
}

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
}


export { generateToken, verifyToken };