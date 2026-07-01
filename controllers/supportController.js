import SupportConversation from "../models/SupportConversation.js";
import SupportMessage from "../models/SupportMessage.js";

// Customer opens or retrieves their active conversation
export const startConversation = async (req, res) => {
    try {
        const { subject } = req.body;
        const customerId = req.user.id;

        // Reuse existing open conversation if one exists
        let conversation = await SupportConversation.findOne({
            customer_id: customerId,
            status: { $in: ["open", "paused"] },
        });

        if (!conversation) {
            conversation = await SupportConversation.create({
                customer_id: customerId,
                subject: subject || "Support Request",
                last_message_at: new Date(),
            });
        }

        return res.status(201).json({ success: true, conversation });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const sendCustomerMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req.body;
        const customerId = req.user.id;

        if (!body?.trim()) {
            return res.status(400).json({ success: false, message: "Message body is required" });
        }

        const conversation = await SupportConversation.findById(id);
        if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });
        if (conversation.customer_id.toString() !== customerId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        if (conversation.status === "closed") {
            return res.status(400).json({ success: false, message: "Conversation is closed" });
        }

        const message = await SupportMessage.create({
            conversation_id: id,
            sender_id: customerId,
            sender_role: "customer",
            body: body.trim(),
        });

        await SupportConversation.findByIdAndUpdate(id, {
            last_message: body.trim().slice(0, 100),
            last_message_at: new Date(),
            status: "open",
            $inc: { unread_by_admin: 1 },
        });

        return res.status(201).json({ success: true, message });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getMyConversation = async (req, res) => {
    try {
        const customerId = req.user.id;

        const conversation = await SupportConversation.findOne({
            customer_id: customerId,
            status: { $in: ["open", "paused"] },
        });

        if (!conversation) return res.json({ success: true, conversation: null });

        const messages = await SupportMessage.find({ conversation_id: conversation._id })
            .populate("sender_id", "name profile_picture")
            .sort({ createdAt: 1 });

        return res.json({ success: true, conversation, messages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
