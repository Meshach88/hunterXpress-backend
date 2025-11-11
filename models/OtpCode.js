import mongoose from "mongoose";

const otpCodeSchema = new mongoose.Schema(
    {
        otp_code: { type: String, required: true },
        otp_reference: { type: String, required: true },
        channel: { type: String, enum: ["sms", "email"], required: true, default: "sms" },
        expires_at: { type: Date, required: true },
        used: { type: Boolean, default: false },
        resend_count: { type: Number, default: 0 },
        last_sent_at: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

const OtpCode = mongoose.models.OtpCode || mongoose.model("OtpCode", otpCodeSchema);

export default OtpCode;
