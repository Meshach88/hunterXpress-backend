import Customer from "../models/Customer.js";

export const getCustomerData = async (req, res) => {
    try {
        const customer = await Customer.findOne({ user_id: req.user.id });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer profile not found"
            });
        }

        return res.json({
            success: true,
            message: "Customer data fetched successfully",
            customer
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const updateCustomerProfile = async (req, res) => {
    try {
        const { pickUpAddress, address } = req.body;

        const updates = {};
        if (pickUpAddress !== undefined) updates.pickUpAddress = pickUpAddress;
        if (address !== undefined) updates.address = address;

        const customer = await Customer.findOneAndUpdate(
            { user_id: req.user.id },
            updates,
            { new: true }
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer profile not found"
            });
        }

        return res.json({
            success: true,
            message: "Profile updated successfully",
            customer
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
