import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    order_reference: { type: String, required: true, unique: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courier_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // pickup_address: {
    //   street: String,
    //   city: String,
    //   state: String,
    //   coordinates: { lat: Number, lng: Number },
    // },
    pick_up_address : String,
    // dropoff_address: {
    //   street: String,
    //   city: String,
    //   state: String,
    //   coordinates: { lat: Number, lng: Number },
    // },
    drop_of_address: String,
    package_details: {
      description: String,
      weight: String,
      value: Number,
    },
    distance_km: Number,
    price: Number,
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
