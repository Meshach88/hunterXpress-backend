import express from 'express';
import { connectDB } from './config/db.js';

const app = express()
const port = process.env.PORT || 3000


// middleware

// Middleware to parse JSON request bodies
app.use(express.json())

//db connection
connectDB()

app.get('/', (req, res) => {
    res.send('API working')
})

app.listen(port, () => { console.log(`Server listening on port ${port}`) })