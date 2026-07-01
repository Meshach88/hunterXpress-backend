import mongoose from "mongoose";

const supportConversationSchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, default: "Support Request" },
    status: { type: String, enum: ["open", "paused", "closed"], default: "open" },
    last_message: { type: String, default: "" },
    last_message_at: { type: Date },
    unread_by_admin: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const SupportConversation =
  mongoose.models.SupportConversation ||
  mongoose.model("SupportConversation", supportConversationSchema);

export default SupportConversation;
