import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    delivery_id: { type: mongoose.Schema.Types.ObjectId, ref: "Delivery", required: true, unique: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courier_id: { type: mongoose.Schema.Types.ObjectId, ref: "Courier", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
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

const Rating = mongoose.models.Rating || mongoose.model("Rating", ratingSchema);

export default Rating;
