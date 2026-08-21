const express = require("express");
const router = express.Router();
const webpush = require("./push");

let subscriptions = [];

router.post("/subscribe", (req, res) => {
  try {
    const subscription = req.body;
    
    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys ||
      !subscription.keys.p256dh ||
      !subscription.keys.auth
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid push subscription."
      });
    }
    
    const exists = subscriptions.some(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (!exists) {
      subscriptions.push(subscription);
    }
    
    res.json({
      success: true,
      message: "Push subscription saved."
    });
  } catch (error) {
    console.error("Push subscription error:", error);
    
    res.status(500).json({
      success: false,
      message: "Failed to save push subscription."
    });
  }
});

router.post("/test", async (req, res) => {
  try {
    const payload = JSON.stringify({
      title: "Test Notification",
      body: "Web push is working!"
    });
    
    const results = await Promise.allSettled(
      subscriptions.map(subscription =>
        webpush.sendNotification(subscription, payload)
      )
    );
    
    res.json({
      success: true,
      sent: results.filter(r => r.status === "fulfilled").length,
      failed: results.filter(r => r.status === "rejected").length
    });
  } catch (error) {
    console.error("Push test error:", error);
    
    res.status(500).json({
      success: false,
      message: "Failed to send test notification."
    });
  }
});

module.exports = router;