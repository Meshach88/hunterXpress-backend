import mongoose from "mongoose";

const courierSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        vehicle_type: { type: String, enum: ["bike", "car", "van", "truck"], required: true },
        plate_number: { type: String, required: true },
        valid_id: { type: String, required: true },
        proof_of_address: { type: String, required: true },
        payout_method: { type: String, required: true },
        bank_account: { type: String, required: true },
        bank_name: { type: String, required: true },
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
