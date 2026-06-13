import bcrypt from 'bcrypt';
import crypto from 'crypto';


const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
}

const comparePassword = (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
}

const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
}


export { hashPassword, comparePassword, hashToken }