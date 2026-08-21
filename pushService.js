const webpush = require("./push");
const db = require("./firebase");

async function sendPushToUser(uid, notification) {
  try {
    const snapshot = await db
      .ref(`pushSubscriptions/${uid}`)
      .once("value");
    
    const subscription = snapshot.val();
    
    if (!subscription) {
      return {
        success: false,
        reason: "No subscription"
      };
    }
    
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.url || "/"
    });
    
    await webpush.sendNotification(
      subscription,
      payload
    );
    
    return {
      success: true
    };
    
  } catch (error) {
    console.error(
      "Push notification failed:",
      error
    );
    
    if (
      error.statusCode === 404 ||
      error.statusCode === 410
    ) {
      await db
        .ref(`pushSubscriptions/${uid}`)
        .remove();
    }
    
    return {
      success: false,
      reason: "Push failed"
    };
  }
}

module.exports = {
  sendPushToUser
};