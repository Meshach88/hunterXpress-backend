import mongoose from "mongoose";

const courierSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        deliveryMethod: {
            type: String,
            enum: ["Bike", "Car", "Van", "Truck"],
            required: true
        },

        plateNumber: {
            type: String,
            required: true
        },

        model: {
            type: String,
            required: true
        },

        color: {
            type: String,
            required: true
        },

        validId: {
            type: String,
            required: true
        },

        proofOfAddress: {
            type: String,
            required: true
        },

        payoutMethod: {
            type: String,
            required: true
        },

        accountNumber: {
            type: String,
            required: true
        },

        bankName: {
            type: String,
            required: true
        },

        rating: {
            type: Number,
            default: 0
        },

        total_deliveries: {
            type: Number,
            default: 0
        },

        total_earnings: {
            type: Number,
            default: 0
        },

        is_online: {
            type: Boolean,
            default: false
        },

        is_available: {
            type: Boolean,
            default: false
        },

        is_verified: {
            type: Boolean,
            default: false
        },
        
        current_order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null
        },

        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point"
            },
            coordinates: {
                type: [Number], // [lng, lat]
                default: [0, 0]
            }
        },

        location_updated_at: {
            type: Date
        }

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
courierSchema.index({ location: "2dsphere" });

const Courier = mongoose.models.Courier || mongoose.model('Courier', courierSchema);

export default Courier;
