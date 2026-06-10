import mongoose from 'mongoose'
import "dotenv/config"

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('DB Connected');
    } catch (error) {
        console.error('DB connection failed:', error.message);
        process.exit(1);
    }
}
