import userModel from "../models/userModel.js";
import validator from 'validator';
import { hashPassword, comparePassword } from "../services/hashService.js";
import { generateToken } from "../services/jwtService.js";


const register = async (req, res) => {
    const { name, email, password, user_type } = req.body;

    try {
        existingUser = await userModel.findOne({ email });

        if (existingUser) {
            res.status(400).json({ success: false, message: "User already exists" })
        }

        if (!validator.isEmail(email)) {
            return res.json({
                success: false,
                message: 'Please enter a valid email'
            });
        }

        if (password.length < 8) {
            return res.json({
                success: "false",
                message: "Please enter a strong password."
            })
        }

        const hashedPassword = await hashPassword(password);
        const newUser = new userModel({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ success: true, message: "User registered successfully" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Error in registering user" })
    }

}


const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!validator.isEmail(email)) {
            return res.json({
                success: false,
                message: 'Please enter a valid email'
            });
        }

        user = await userModel.findOne({ email });

        if (!user) {
            res.status($400).json({ success: false, message: "Invalid email or password" });
        }
        //compare password
        isMatch = await comparePassword(password, user.password);

        if (!isMatch) {
            res.status(400).json({ success: false, messagge: "Invalid email or password" });
        }
        const token = generateToken({ id: user._id, email: user.email })
        res.status(201).json({ success: true, message: "Login successful", token })

    } catch (error) {
        res.status(500).json({ success: false, message: "Error in login" })
    }
}


export { register, login };