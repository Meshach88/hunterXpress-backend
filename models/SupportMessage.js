import mongoose from "mongoose";

const supportMessageSchema = new mongoose.Schema(
  {
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportConversation",
      required: true,
    },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender_role: { type: String, enum: ["customer", "admin"], required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

const SupportMessage =
  mongoose.models.SupportMessage ||
  mongoose.model("SupportMessage", supportMessageSchema);

export default SupportMessage;
