import express from 'express';
import { connectDB } from './config/db.js';
import userRouter from './routes/userRoute.js';

const app = express()
const port = process.env.PORT || 3000


//db connection
connectDB()

// middleware
// Middleware to parse JSON request bodies
app.use(express.json())

app.use('/api/user', userRouter);

app.get('/', (req, res) => {
    res.send('API working')
})

app.listen(port, () => { console.log(`Server listening on port ${port}`) })