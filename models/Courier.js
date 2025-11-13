import mongoose from "mongoose";

const courierSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        deliveryMethod: { type: String, enum: ["Bike", "Car", "Van", "Truck"], required: true },
        plateNumber: { type: String, required: true },
        model: { type: String, required: true },
        color: { type: String, required: true },
        validId: { type: String, required: true },
        proofOfAddress: { type: String, required: true },
        payoutMethod: { type: String, required: true },
        accountNumber: { type: String, required: true },
        bankName: { type: String, required: true },
        rating: { type: Number, default: 0 },
        total_deliveries: { type: Number, default: 0 },
        is_available: { type: Boolean, default: false },
        is_verified: { type: Boolean, default: false },
        last_known_location: {
            lat: { type: Number },
            lng: { type: Number },
            last_updated: { type: Date },
        },
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

// Add location index for geospatial queries
courierSchema.index({ "last_known_location": "2dsphere" });

const Courier = mongoose.models.Courier || mongoose.model('Courier', courierSchema);

export default Courier;
