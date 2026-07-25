import mongoose from "mongoose";

const courierSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Vehicle, document and payout details are optional at signup time -
        // couriers can skip this step and complete their profile later.
        deliveryMethod: {
            type: String,
            enum: ["Bike", "Car", "Van", "Truck", ""],
            default: ""
        },

        plateNumber: {
            type: String,
            default: ""
        },

        model: {
            type: String,
            default: ""
        },

        color: {
            type: String,
            default: ""
        },

        validId: {
            type: String,
            default: ""
        },

        proofOfAddress: {
            type: String,
            default: ""
        },

        address: {
            type: String,
            default: ""
        },

        payoutMethod: {
            type: String,
            default: ""
        },

        accountNumber: {
            type: String,
            default: ""
        },

        bankName: {
            type: String,
            default: ""
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
            ref: "Delivery",
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
        },

        // Set when the courier goes online, cleared when they go offline -
        // used to compute how long they've been online this session.
        online_since: {
            type: Date,
            default: null
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
