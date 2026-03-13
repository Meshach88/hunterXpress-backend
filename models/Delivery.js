import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    order_reference: { type: String, required: true, unique: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courier_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sender: { type: String, required: true },
    pickup_address: {
      type: {
        address: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
      },
      required: true
    },
    recipient: { type: String, required: true },
    dropoff_address: {
      type: {
        address: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
      },
      required: true
    },
    package_details: {
      description: String,
      weight: String,
      value: Number,
    },
    photo_upload: String,
    distance_km: { type: Number, required: true },
    estimated_time: { type: Number, required: true },
    price: { type: Number, required: true },
    delivery_status: {
      type: String,
      enum: ["pending", "assigned", "accepted", "picked_up", "in_transit", "delivered", "confirmed", "cancelled"],
      default: "pending",
    },
    proof_of_delivery: {
      signature_url: String,
      photo_url: String,
    },
    confirmed_by_customer: { type: Boolean, default: false },
    payment_status: { type: String, enum: ["pending", "paid"], default: "pending" },
  },
  { timestamps: true }
);

const Delivery = mongoose.models.Delivery || mongoose.model('Delivery', deliverySchema);

export default Delivery;
