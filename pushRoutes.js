const express = require("express");
const router = express.Router();
const webpush = require("./push");
const db = require("./firebase");
const authenticate = require("./middleware");

router.post("/subscribe", authenticate, async (req, res) => {
  try {
    const subscription = req.body;
    const uid = req.user.uid;
    
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
    
    await db
      .ref(`pushSubscriptions/${uid}`)
      .set(subscription);
    
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

router.post("/test", authenticate, async (req, res) => {
  try {
    const uid = req.user.uid;
    
    const snapshot = await db
      .ref(`pushSubscriptions/${uid}`)
      .once("value");
    
    const subscription = snapshot.val();
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No push subscription found for this user."
      });
    }
    
    const payload = JSON.stringify({
      title: "Test Notification",
      body: "Web push is working!",
      url: "/"
    });
    
    await webpush.sendNotification(
      subscription,
      payload
    );
    
    res.json({
      success: true,
      message: "Test notification sent."
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