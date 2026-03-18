import Courier from "../models/Courier.js";
import { dispatchResponses } from "../events/dispatchEvents.js";

const locationUpdateInterval = 5000; // 5 seconds

// store last DB write timestamp
const courierLastUpdate = new Map();

// store active courier sockets
export const courierSockets = new Map();

export const courierSocketHandler = (io, socket) => {

  console.log("Courier connected:", socket.id);

  /**
   * Register courier
   */
  socket.on("register_courier", ({ courierId }) => {

    if (!courierId) return;

    // attach courierId to socket
    socket.courierId = courierId;

    // store socket mapping
    courierSockets.set(courierId, socket.id);

    console.log("Courier registered:", courierId);

  });


  /**
   * Location update from courier app
   */
  socket.on("location_update", async (data) => {

    try {

      if (!socket.courierId) return;

      const { latitude, longitude } = data;

      // validate coordinates
      if (
        latitude === undefined ||
        longitude === undefined ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180
      ) {
        return;
      }

      const courierId = socket.courierId;

      const lastUpdate = courierLastUpdate.get(courierId);

      // throttle DB writes
      if (lastUpdate && Date.now() - lastUpdate < locationUpdateInterval) {
        return;
      }

      courierLastUpdate.set(courierId, Date.now());

      const courier = await Courier.findById(courierId);

      if (!courier || !courier.is_online) return;

      const updated = await Courier.findByIdAndUpdate(
        courierId,
        {
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          location_updated_at: new Date(),
        },
        { new: true }
      );

      console.log("Location updated:", updated.location);

      /**
       * OPTIONAL: broadcast location to tracking clients
       */
      io.emit("courier_location_update", {
        courierId,
        latitude,
        longitude,
      });

    } catch (error) {

      console.error("Location update error:", error);

    }

  });

  socket.on("accept_delivery", async ({ orderId, courierId }) => {

    const order = await Delivery.findOneAndUpdate(
      {
        _id: orderId,
        assigned_courier_id: null
      },
      {
        assigned_courier_id: courierId,
        delivery_status: "assigned"
      },
      { new: true }
    );

    if (order) {
      // This courier WON
      dispatchResponses.emit(`${orderId}_${courierId}`, true);

      console.log("Courier WON:", courierId);

    } else {
      // Someone else already took it
      socket.emit("delivery_taken");

      console.log("Courier LOST:", courierId);
    }

  });

  socket.on("reject_delivery", ({ orderId, courierId }) => {

    dispatchResponses.emit(`${orderId}_${courierId}`, false);

  });

  /**
   * Handle courier disconnect
   */
  socket.on("disconnect", () => {

    console.log("Courier disconnected:", socket.id);

    if (socket.courierId) {

      courierSockets.delete(socket.courierId);
      courierLastUpdate.delete(socket.courierId);

      console.log("Courier removed from active sockets:", socket.courierId);

    }

  });

};