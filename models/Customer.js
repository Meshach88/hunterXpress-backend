import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  label: String,
  street: String,
  city: String,
  state: String,
  coordinates: {
    lat: Number,
    lng: Number,
  },
});

const customerSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    default_pickup_address: { type: String, required: true },
    delivery_address: { type: String, required: true },
    total_orders: { type: Number, default: 0 },
    average_rating: { type: Number, default: 0 },
    last_order_at: { type: Date },
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

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

export default Customer;
