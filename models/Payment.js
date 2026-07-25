import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        delivery_id: { type: mongoose.Schema.Types.ObjectId, ref: "Delivery", required: true },
        customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        reference: { type: String, required: true, unique: true },
        amount: { type: Number, required: true }, // kobo, matches what's sent to Paystack
        status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
        channel: { type: String, default: "" },
        paid_at: { type: Date },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.__v;
                return ret;
            }
        }
    }
);

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
