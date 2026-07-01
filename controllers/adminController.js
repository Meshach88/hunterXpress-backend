import User from "../models/User.js";
import Courier from "../models/Courier.js";
import Customer from "../models/Customer.js";
import Delivery from "../models/Delivery.js";
import Rating from "../models/Rating.js";
import SupportConversation from "../models/SupportConversation.js";
import SupportMessage from "../models/SupportMessage.js";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboardStats = async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalOrdersToday,
            ordersInProgress,
            completedDeliveries,
            revenueTodayResult,
            activeRiders,
            recentDeliveries,
            dailyStats,
            topCouriers,
        ] = await Promise.all([
            Delivery.countDocuments({ createdAt: { $gte: todayStart } }),
            Delivery.countDocuments({
                delivery_status: { $in: ["assigned", "accepted", "picked_up", "in_transit"] },
            }),
            Delivery.countDocuments({
                delivery_status: { $in: ["delivered", "completed"] },
            }),
            Delivery.aggregate([
                { $match: { payment_status: "paid", createdAt: { $gte: todayStart } } },
                { $group: { _id: null, total: { $sum: "$price" } } },
            ]),
            Courier.countDocuments({ is_online: true }),
            Delivery.find()
                .sort({ updatedAt: -1 })
                .limit(10)
                .populate("customer_id", "name")
                .populate("assigned_courier_id", "user_id"),
            Delivery.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        orders: { $sum: 1 },
                        revenue: {
                            $sum: { $cond: [{ $eq: ["$payment_status", "paid"] }, "$price", 0] },
                        },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            Courier.find()
                .sort({ total_deliveries: -1 })
                .limit(5)
                .populate("user_id", "name profile_picture"),
        ]);

        const statusLabels = {
            pending: "New order placed",
            confirmed: "Order confirmed",
            assigned: "Order assigned to rider",
            accepted: "Order accepted by rider",
            picked_up: "Package picked up",
            in_transit: "Order in transit",
            delivered: "Order delivered",
            completed: "Order completed",
            cancelled: "Order cancelled",
        };

        const recentActivity = recentDeliveries.map((d) => ({
            id: d._id,
            text: `${statusLabels[d.delivery_status] || "Order updated"} — ${d.order_reference}`,
            customer: d.customer_id?.name || "Unknown",
            time: d.updatedAt,
        }));

        return res.json({
            success: true,
            metrics: {
                totalOrdersToday,
                ordersInProgress,
                completedDeliveries,
                totalRevenueToday: revenueTodayResult[0]?.total || 0,
                activeRiders,
            },
            recentActivity,
            chartData: dailyStats,
            topCouriers,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const listUsers = async (req, res) => {
    try {
        const { search, role, is_suspended, page = 1, limit = 20 } = req.query;

        const filter = {};
        if (role) filter.role = role;
        if (is_suspended !== undefined) filter.is_suspended = is_suspended === "true";
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [users, total] = await Promise.all([
            User.find(filter)
                .select("-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            User.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            users,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getUserByIdAdmin = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        return res.json({ success: true, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const setUserSuspension = async (req, res) => {
    try {
        const { is_suspended } = req.body;
        const { id } = req.params;

        if (id === req.adminUser._id.toString()) {
            return res.status(400).json({ success: false, message: "You cannot suspend your own account" });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { is_suspended },
            { new: true, select: "-password" }
        );

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        return res.json({
            success: true,
            message: is_suspended ? "User suspended" : "User reactivated",
            user,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const setUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const { id } = req.params;

        const allowedRoles = ["customer", "courier", "admin"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }

        if (id === req.adminUser._id.toString() && role !== "admin") {
            return res.status(400).json({ success: false, message: "You cannot demote your own admin account" });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { role },
            { new: true, select: "-password" }
        );

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        return res.json({ success: true, message: `User role updated to ${role}`, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── Couriers / Riders ────────────────────────────────────────────────────────

const courierCompletionScore = (courier) => {
    const fields = [
        courier.deliveryMethod,
        courier.plateNumber,
        courier.model,
        courier.color,
        courier.validId,
        courier.proofOfAddress,
        courier.payoutMethod,
        courier.accountNumber,
    ];
    const filled = fields.filter((f) => f && f !== "").length;
    return Math.round((filled / fields.length) * 100);
};

export const listCouriers = async (req, res) => {
    try {
        const { search, is_verified, is_online, page = 1, limit = 20 } = req.query;

        const courierFilter = {};
        if (is_verified !== undefined) courierFilter.is_verified = is_verified === "true";
        if (is_online !== undefined) courierFilter.is_online = is_online === "true";

        const userFilter = {};
        if (search) {
            userFilter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
            ];
        }

        let userIds;
        if (search) {
            const matchedUsers = await User.find(userFilter).select("_id");
            userIds = matchedUsers.map((u) => u._id);
            courierFilter.user_id = { $in: userIds };
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [couriers, total] = await Promise.all([
            Courier.find(courierFilter)
                .populate("user_id", "name email phone profile_picture is_suspended createdAt")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Courier.countDocuments(courierFilter),
        ]);

        const data = couriers.map((c) => ({
            ...c.toObject(),
            profileCompletion: courierCompletionScore(c),
        }));

        return res.json({
            success: true,
            couriers: data,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getCourierByIdAdmin = async (req, res) => {
    try {
        const courier = await Courier.findById(req.params.id).populate(
            "user_id",
            "name email phone profile_picture is_suspended createdAt"
        );
        if (!courier) return res.status(404).json({ success: false, message: "Courier not found" });
        return res.json({
            success: true,
            courier: { ...courier.toObject(), profileCompletion: courierCompletionScore(courier) },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const setCourierVerification = async (req, res) => {
    try {
        const { is_verified } = req.body;

        const courier = await Courier.findByIdAndUpdate(
            req.params.id,
            { is_verified },
            { new: true }
        ).populate("user_id", "name email");

        if (!courier) return res.status(404).json({ success: false, message: "Courier not found" });

        return res.json({
            success: true,
            message: is_verified ? "Courier verified" : "Courier verification revoked",
            courier,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── Deliveries / Orders ──────────────────────────────────────────────────────

export const listDeliveries = async (req, res) => {
    try {
        const { tab, search, page = 1, limit = 20 } = req.query;

        const filter = {};
        if (tab === "prepaid") {
            filter.payment_status = "paid";
            filter.delivery_status = { $in: ["confirmed", "assigned", "pending"] };
        } else if (tab === "in_transit") {
            filter.delivery_status = { $in: ["accepted", "picked_up", "in_transit"] };
        } else if (tab === "completed") {
            filter.delivery_status = { $in: ["delivered", "confirmed", "completed"] };
        }

        if (search) filter.order_reference = { $regex: search, $options: "i" };

        const skip = (Number(page) - 1) * Number(limit);

        const [deliveries, total] = await Promise.all([
            Delivery.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate("customer_id", "name phone email"),
            Delivery.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            deliveries,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getDeliveryByIdAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const delivery = await Delivery.findById(id)
            .populate("customer_id", "name phone email profile_picture")
            .populate("courier_id", "name phone profile_picture");

        if (!delivery) return res.status(404).json({ success: false, message: "Order not found" });

        const order = delivery.toObject();

        if (delivery.assigned_courier_id) {
            const courierProfile = await Courier.findById(delivery.assigned_courier_id).populate(
                "user_id",
                "name phone profile_picture"
            );
            if (courierProfile) {
                order.courierProfile = {
                    ...courierProfile.toObject(),
                    name: courierProfile.user_id?.name,
                    phone: courierProfile.user_id?.phone,
                    profile_picture: courierProfile.user_id?.profile_picture,
                };
            }
        }

        return res.json({ success: true, delivery: order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const reassignDelivery = async (req, res) => {
    try {
        const { courierId } = req.body;
        const { id } = req.params;

        const delivery = await Delivery.findById(id);
        if (!delivery) return res.status(404).json({ success: false, message: "Order not found" });

        const terminalStatuses = ["delivered", "confirmed", "completed", "cancelled"];
        if (terminalStatuses.includes(delivery.delivery_status)) {
            return res.status(400).json({ success: false, message: "Cannot reassign a completed or cancelled order" });
        }

        const newCourier = await Courier.findById(courierId);
        if (!newCourier) return res.status(404).json({ success: false, message: "Courier not found" });

        // Free up the previous courier
        if (delivery.assigned_courier_id) {
            await Courier.findByIdAndUpdate(delivery.assigned_courier_id, {
                is_available: true,
                current_order_id: null,
            });
        }

        // Assign to new courier
        delivery.assigned_courier_id = courierId;
        delivery.delivery_status = "assigned";
        delivery.status_history.push({ status: "assigned", timestamp: new Date() });
        await delivery.save();

        await Courier.findByIdAndUpdate(courierId, {
            is_available: false,
            current_order_id: delivery._id,
        });

        return res.json({ success: true, message: "Order reassigned successfully", delivery });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const cancelDeliveryAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const delivery = await Delivery.findById(id);
        if (!delivery) return res.status(404).json({ success: false, message: "Order not found" });

        const terminalStatuses = ["completed", "cancelled"];
        if (terminalStatuses.includes(delivery.delivery_status)) {
            return res.status(400).json({ success: false, message: "Order is already completed or cancelled" });
        }

        if (delivery.assigned_courier_id) {
            await Courier.findByIdAndUpdate(delivery.assigned_courier_id, {
                is_available: true,
                current_order_id: null,
            });
        }

        delivery.delivery_status = "cancelled";
        delivery.assigned_courier_id = null;
        await delivery.save();

        return res.json({ success: true, message: "Order cancelled", delivery });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── Live Locations ───────────────────────────────────────────────────────────

export const getLiveLocations = async (req, res) => {
    try {
        const couriers = await Courier.find({ is_online: true })
            .populate("user_id", "name phone profile_picture")
            .select("user_id location is_available current_order_id location_updated_at deliveryMethod");

        return res.json({ success: true, couriers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const listPayments = async (req, res) => {
    try {
        const { page = 1, limit = 20, payment_status } = req.query;

        const filter = {};
        if (payment_status) filter.payment_status = payment_status;

        const skip = (Number(page) - 1) * Number(limit);

        const [deliveries, total, revenueResult] = await Promise.all([
            Delivery.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .select("order_reference customer_id price payment_status delivery_status createdAt")
                .populate("customer_id", "name email phone"),
            Delivery.countDocuments(filter),
            Delivery.aggregate([
                { $match: { payment_status: "paid" } },
                { $group: { _id: null, total: { $sum: "$price" } } },
            ]),
        ]);

        return res.json({
            success: true,
            payments: deliveries,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalRevenue: revenueResult[0]?.total || 0,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── Ratings ──────────────────────────────────────────────────────────────────

export const listRatings = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const [ratings, total] = await Promise.all([
            Rating.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate("customer_id", "name email profile_picture")
                .populate("courier_id", "user_id")
                .populate("delivery_id", "order_reference"),
            Rating.countDocuments(),
        ]);

        return res.json({
            success: true,
            ratings,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const deleteRating = async (req, res) => {
    try {
        const rating = await Rating.findByIdAndDelete(req.params.id);
        if (!rating) return res.status(404).json({ success: false, message: "Rating not found" });
        return res.json({ success: true, message: "Rating deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── CSV Export ───────────────────────────────────────────────────────────────

export const exportDeliveriesCSV = async (req, res) => {
    try {
        const deliveries = await Delivery.find()
            .sort({ createdAt: -1 })
            .populate("customer_id", "name email phone");

        const header = [
            "Order Reference",
            "Customer Name",
            "Customer Email",
            "Sender",
            "Recipient",
            "Pickup Address",
            "Dropoff Address",
            "Price",
            "Payment Status",
            "Delivery Status",
            "Distance (km)",
            "Created At",
        ].join(",");

        const rows = deliveries.map((d) => [
            d.order_reference,
            d.customer_id?.name || "",
            d.customer_id?.email || "",
            d.sender,
            d.recipient,
            `"${d.pickup_address?.address || ""}"`,
            `"${d.dropoff_address?.address || ""}"`,
            d.price,
            d.payment_status,
            d.delivery_status,
            d.distance_km,
            d.createdAt?.toISOString(),
        ].join(","));

        const csv = [header, ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=deliveries.csv");
        return res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ─── Support (admin side) ─────────────────────────────────────────────────────

export const getSupportConversations = async (req, res) => {
    try {
        const { status, page = 1, limit = 30 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [conversations, total] = await Promise.all([
            SupportConversation.find(filter)
                .populate("customer_id", "name email profile_picture")
                .sort({ last_message_at: -1, createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            SupportConversation.countDocuments(filter),
        ]);

        return res.json({ success: true, conversations, total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getSupportMessages = async (req, res) => {
    try {
        const { id } = req.params;

        const conversation = await SupportConversation.findById(id).populate(
            "customer_id",
            "name email profile_picture"
        );
        if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });

        // Mark as read by admin
        if (conversation.unread_by_admin > 0) {
            await SupportConversation.findByIdAndUpdate(id, { unread_by_admin: 0 });
        }

        const messages = await SupportMessage.find({ conversation_id: id })
            .populate("sender_id", "name profile_picture")
            .sort({ createdAt: 1 });

        return res.json({ success: true, conversation, messages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const sendSupportReply = async (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req.body;

        if (!body?.trim()) {
            return res.status(400).json({ success: false, message: "Message body is required" });
        }

        const conversation = await SupportConversation.findById(id);
        if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });
        if (conversation.status === "closed") {
            return res.status(400).json({ success: false, message: "Conversation is closed" });
        }

        const message = await SupportMessage.create({
            conversation_id: id,
            sender_id: req.adminUser._id,
            sender_role: "admin",
            body: body.trim(),
        });

        await SupportConversation.findByIdAndUpdate(id, {
            last_message: body.trim().slice(0, 100),
            last_message_at: new Date(),
            status: "open",
        });

        const populated = await message.populate("sender_id", "name profile_picture");
        return res.status(201).json({ success: true, message: populated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const setSupportStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ["open", "paused", "closed"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const conversation = await SupportConversation.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate("customer_id", "name email profile_picture");

        if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });

        return res.json({ success: true, conversation });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
