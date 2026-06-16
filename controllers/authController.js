import User from "../models/User.js";
import Courier from "../models/Courier.js";
import Customer from "../models/Customer.js";
import OtpCode from "../models/OtpCode.js";
import { sendSms } from "../utils/sendSMS.js";
import { sendEmail } from "../utils/sendEmail.js";
import validator from 'validator';
import RefreshToken from "../models/RefreshToken.js";
import { hashPassword, comparePassword, hashToken } from "../services/hashService.js";
import { generateToken, verifyToken, generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../services/jwtService.js";
import { v4 as uuidv4 } from 'uuid';
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

const ALLOWED_ROLES = ["customer", "courier"];
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const ALLOWED_DELIVERY_METHODS = ["Bike", "Car", "Van", "Truck"];

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const REFRESH_TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
};

const register = async (req, res) => {

    try {
        const { name, email, phone, password, role, otp, otp_reference } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ status: false, message: "Full name is required" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ status: false, message: "Invalid email" });
        }

        if (!phone || !PHONE_REGEX.test(phone)) {
            return res.status(400).json({ status: false, message: "A valid phone number is required" });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({ status: false, message: "Weak password" });
        }

        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ status: false, message: "Invalid role" });
        }

        if (!otp || !otp_reference) {
            return res.status(400).json({ status: false, message: "OTP verification is required" });
        }

        if (role === "courier") {
            // Vehicle/document/payout details are optional at signup time -
            // couriers can skip this step and complete their profile later.
            const { deliveryMethod } = req.body;

            if (deliveryMethod && !ALLOWED_DELIVERY_METHODS.includes(deliveryMethod)) {
                return res.status(400).json({ status: false, message: "Invalid delivery method" });
            }
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { phone }]
        });

        if (existingUser) {
            return res.status(400).json({ message: "Account already exists" });
        }

        const otpRecord = await OtpCode.findOne({
            otp_code: otp,
            otp_reference,
            email,
            phone,
            used: false,
            expires_at: { $gte: new Date() }
        });

        if (!otpRecord) {
            return res.status(400).json({ status: false, message: "Invalid or expired OTP" });
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

            await OtpCode.deleteOne({ _id: otpRecord._id }, { session });

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

// Fire-and-forget: dispatches the OTP via SMS/email in the background so the
// request doesn't block on a third-party API. Failures are logged, not thrown,
// since the user can always request a resend.
const deliverOtpInBackground = ({ channel, phone, email, otp, label = "verification code" }) => {
    const delivery = channel === "sms"
        ? sendSms(phone, `Your ${label} is: ${otp}`)
        : sendEmail(email, "Your Verification Code", `<p> <b>${otp}</b> is your ${label}</p><p>Do not share this code.</p>`);

    delivery.catch((err) => {
        console.error(`OTP delivery failed (channel=${channel}, target=${channel === "sms" ? phone : email}):`, err.message);
    });
};

const sendOtp = async (req, res) => {
    try {
        const { phone, email, channel } = req.body;

        if (channel === "sms") {
            if (!phone) {
                return res.status(400).json({ message: "Phone number is required to send an SMS OTP" });
            }
        } else if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ message: "A valid email and phone number is required to send an OTP" });
        }

        const otp = generateOTP();
        const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
        const otp_reference = uuidv4()

        await OtpCode.create({ otp_code: otp, otp_reference, channel, phone, email, expires_at });

        deliverOtpInBackground({ channel, phone, email, otp, label: "verification code" });

        return res.json({ message: "OTP is being sent", otp_reference });
    } catch (err) {
        console.error(err);
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

        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        await otpRecord.deleteOne();

        return res.json({ message: "OTP verified successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const { otp_reference, channel, phone, email } = req.body;

        if (channel === "sms") {
            if (!phone) {
                return res.status(400).json({ message: "Phone number is required to resend an SMS OTP" });
            }
        } else if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ message: "A valid email is required to resend an OTP" });
        }

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

        deliverOtpInBackground({ channel, phone, email, otp: newOtp, label: "new verification code" });

        return res.json({ message: "New OTP is being sent." });
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
        const token = generateAccessToken({ id: user._id, email: user.email })
        const refreshToken = generateRefreshToken({ id: user._id })

        await RefreshToken.create({
            user_id: user._id,
            token: hashToken(refreshToken),
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
        });

        res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

        let profile = null;
        if (user.role === "courier") profile = await Courier.findOne({ user_id: user._id });
        if (user.role === "customer") profile = await Customer.findOne({ user_id: user._id });
        return res.json({ success: true, message: "Login successful", token, refreshToken, user, profile });

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

const updateProfilePicture = async (req, res) => {
    try {
        const { profile_picture } = req.body;

        if (!profile_picture) {
            return res.status(400).json({ success: false, message: "profile_picture URL is required" });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { profile_picture },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "Profile picture updated", user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}


const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "A valid email is required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with that email address" });
        }

        const resetToken = generateToken(
            { id: user._id, purpose: "password_reset" },
            { expiresIn: "15m" }
        );

        const resetLink = `${process.env.FRONTEND_URL}/welcome/reset-password?token=${resetToken}`;

        sendEmail(
            email,
            "Reset Your Password",
            `<p>You requested a password reset. Click the link below to set a new password. This link expires in 15 minutes.</p>
             <p><a href="${resetLink}">Reset Password</a></p>
             <p>If you did not request this, you can safely ignore this email.</p>`
        ).catch((err) => {
            console.error("Password reset email delivery failed:", err.message);
        });

        return res.json({ success: true, message: "Password reset link sent to your email" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password:newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: "Token and new password are required" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        let decoded;
        try {
            decoded = verifyToken(token);
        } catch {
            return res.status(400).json({ success: false, message: "Invalid or expired reset link" });
        }

        if (decoded.purpose !== "password_reset") {
            return res.status(400).json({ success: false, message: "Invalid reset token" });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // const isSamePassword = await comparePassword(newPassword, user.password);
        // if (isSamePassword) {
        //     return res.status(400).json({ success: false, message: "The new password must be different from your current password" });
        // }

        // Check common variations against the old hash to catch similar passwords.
        // We can't reverse the hash, so we test transformed versions of the new password.
        // const variations = [...new Set([
        //     newPassword.toLowerCase(),
        //     newPassword.toUpperCase(),
        //     newPassword.replace(/\d+$/, ''),   // trailing digits removed
        //     newPassword.replace(/^\d+/, ''),   // leading digits removed
        //     newPassword.replace(/[^a-zA-Z]/g, ''), // letters only
        // ])].filter(v => v !== newPassword && v.length >= 6);

        // for (const variant of variations) {
        //     if (await comparePassword(variant, user.password)) {
        //         return res.status(400).json({ success: false, message: "The new password is too similar to your current password. Please choose a different password." });
        //     }
        // }

        user.password = await hashPassword(newPassword);
        await user.save();

        return res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const passwordSimilarityRatio = (a, b) => {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return 1 - dp[m][n] / Math.max(m, n);
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current and new password are required" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Current password is incorrect" });
        }

        if (passwordSimilarityRatio(currentPassword, newPassword) >= 0.7) {
            return res.status(400).json({ success: false, message: "New password is too similar to your current password" });
        }

        user.password = await hashPassword(newPassword);
        await user.save();

        return res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ success: false, message: "No refresh token provided" });
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (error) {
            return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
        }

        const storedToken = await RefreshToken.findOne({
            user_id: decoded.id,
            token: hashToken(refreshToken),
            revoked: false,
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        const token = generateAccessToken({ id: user._id, email: user.email });
        return res.json({ success: true, token, refreshToken });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            await RefreshToken.updateOne(
                { user_id: req.user.id, token: hashToken(refreshToken) },
                { revoked: true }
            );
        }

        res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);
        return res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export { register, login, profile, updateProfilePicture, generateOTP, sendOtp, verifyOtp, forgotPassword, resetPassword, changePassword, refreshAccessToken, logout };