import User from "../models/User.js";
import Courier from "../models/Courier.js";
import Customer from "../models/Customer.js";
import OtpCode from "../models/OtpCode.js";
import { sendSms } from "../utils/sendSMS.js";
import { sendEmail } from "../utils/sendEmail.js";
import validator from 'validator';
import { hashPassword, comparePassword } from "../services/hashService.js";
import { generateToken } from "../services/jwtService.js";
import { v4 as uuidv4 } from 'uuid';
import { uploadToCloudinary } from "../utils/cloudinary.js";


const register = async (req, res) => {

    try {
        const { name, email, phone, otp, password, role } = req.body;
        console.log(req.body);

        if (!validator.isEmail(email)) {
            return res.status(400).json({ status: false, message: "Invalid email" });
        }

        if (password.length < 8) {
            return res.status(400).json({ status: false, message: "Weak password" });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { phone }]
        });

        if (existingUser) {
            return res.status(400).json({ message: "Account already exists" });
        }

        let validIdUpload, proofUpload;

        if (role === "courier") {            
            const validIdFile = req.files?.validId?.[0];
            const proofFile = req.files?.proofOfAddress?.[0];

            if (validIdFile && proofFile) {
                [validIdUpload, proofUpload] = await Promise.all([
                    uploadToCloudinary(validIdFile.buffer),
                    uploadToCloudinary(proofFile.buffer)
                ]);
            }
        }
        const session = await User.startSession();
        session.startTransaction();
        try {
            const hashedPassword = await hashPassword(password);

            const newUser = await User.create(
                [{ name, email, phone, password: hashedPassword, role }],
                { session }
            );

            // console.log(newUser);

            const userId = newUser[0]._id;

            if (role === "courier") {
                const {
                    deliveryMethod,
                    model,
                    color,
                    plateNumber,
                    validId,
                    proofOfAddress,
                    payoutMethod,
                    bankName,
                    accountNumber
                } = req.body;

                await Courier.create([{
                    user_id: userId,
                    deliveryMethod,
                    model,
                    color,
                    plateNumber,
                    validId: validIdUpload ? validIdUpload.secure_url : validId,
                    proofOfAddress: proofUpload ? proofUpload.secure_url : proofOfAddress,
                    payoutMethod,
                    bankName,
                    accountNumber
                }], { session });

            } else if (role === "customer") {
                const { pickUpAddress, address } = req.body;

                await Customer.create([{
                    user_id: userId,
                    pickUpAddress,
                    address
                }], { session });
            }

            await session.commitTransaction();
            session.endSession();

            return res.status(201).json({
                success: true,
                message: "Account created successfully"
            });

        } catch (dbError) {
            await session.abortTransaction();
            session.endSession();

            if (validIdUpload) {
                await cloudinary.uploader.destroy(validIdUpload.public_id);
            }
            if (proofUpload) {
                await cloudinary.uploader.destroy(proofUpload.public_id);
            }

            throw dbError;
        }

    } catch (error) {
        console.error(error)
        return res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
};


// extract otp stuffs into a service

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOtp = async (req, res) => {
    try {
        const { phone, email, channel } = req.body;

        const otp = generateOTP();
        const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
        const otp_reference = uuidv4()

        await OtpCode.create({ otp_code: otp, otp_reference, channel, phone, expires_at });

        // await sendSms(phone, `Your Verification code is: ${otp}`);
        await sendEmail(email, "Your Verification Code", `<p> <b>${otp}</b> is your verification code</p><p>Do not share this code.</p>`);
        //Add WhatsApp
        return res.json({ message: "OTP sent successfully", otp_reference });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp, otp_reference } = req.body;

        const otpRecord = await OtpCode.findOne({
            otp_code: otp,
            otp_reference,
            used: false,
            expires_at: { $gte: new Date() }
        });
        console.log(otpRecord)

        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        otpRecord.delete()

        // otpRecord.used = true;
        // await otpRecord.save();

        return res.json({ message: "OTP verified successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const { otp_reference, channel, phone } = req.body;

        const otpRecord = await OtpCode.findOne({ otp_reference });

        if (!otpRecord) {
            return res.status(404).json({ message: "OTP reference not found" });
        }

        // Rate limit: max 3 attempts, and at least 1 minute apart
        const now = new Date();
        const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);

        if (otpRecord.resend_count >= 3) {
            return res.status(429).json({ message: "Maximum resend attempts reached. Try again later." });
        }

        if (otpRecord.last_sent_at > oneMinuteAgo) {
            return res.status(429).json({ message: "Please wait 1 minute before requesting another code." });
        }

        // Generate new OTP
        const newOtp = generateOTP();
        otpRecord.otp_code = newOtp;
        otpRecord.resend_count += 1;
        otpRecord.last_sent_at = now;
        otpRecord.expires_at = new Date(Date.now() + 10 * 60 * 1000);
        await otpRecord.save();

        // Send OTP
        if (channel === "sms") {
            await sendSms(phone, `Your new verification code is: ${newOtp}`);
        } else {
            await sendEmail(email, "Your Verification Code", `<h1>${newOtp}</h1>`);
        }

        return res.json({ message: "New OTP sent successfully." });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
};

const login = async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;

        if (!emailOrPhone || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide your email or phone and password",
            });
        }

        // Determine if the input is an email or a phone number
        let user;
        if (validator.isEmail(emailOrPhone)) {
            user = await User.findOne({ email: emailOrPhone });
        } else {
            // Normalize phone number if needed (optional)
            const phone = emailOrPhone.replace(/\s+/g, "");
            user = await User.findOne({ phone });
        }

        if (!user) {
            return res.json({ success: false, message: "Invalid credentials" });
        }
        //compare password
        const isMatch = await comparePassword(password, user.password);

        if (!isMatch) {
            return res.json({ success: false, message: "Invalid credentials" });
        }
        const token = generateToken({ id: user._id, email: user.email })

        let profile = null;
        if (user.role === "courier") profile = await Courier.findOne({ user_id: user._id });
        if (user.role === "customer") profile = await Customer.findOne({ user_id: user._id });
        return res.json({ success: true, message: "Login successful", token, user, profile });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error in login" })
    }
}

const profile = async (req, res) => {
    res.json({
        success: true,
        message: "Welcome to your profile",
        user: req.user
    })
}


export { register, login, profile, generateOTP, sendOtp, verifyOtp };