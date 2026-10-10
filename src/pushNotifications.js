import {
  getPushSubscription,
  deletePushSubscription
} from "./storage.js";
import {
  sendWebPush
} from "./push.js";
export async function sendPushToUser(
  env,
  userId,
  title,
  body,
  url = "/"
) {
  try {
    const subscription =
      await getPushSubscription(
        env.DB,
        userId
      );
    if (!subscription) {
      return {
        success: false,
        reason: "No subscription"
      };
    }
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };
    const payload = JSON.stringify({
      title,
      body,
      url
    });
    await sendWebPush(
      env,
      pushSubscription,
      payload
    );
    return {
      success: true
    };
  } catch (error) {
    console.error(
      "Push notification failed:",
      {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack
      }
    );
    if (
      error.statusCode === 404 ||
      error.statusCode === 410
    ) {
      try {
        await deletePushSubscription(
          env.DB,
          userId
        );
      } catch (deleteError) {
        console.error(
          "Failed to delete expired push subscription:",
          deleteError.message
        );
      }
    }
    return {
      success: false,
      reason: error.message || "Push failed",
      statusCode: error.statusCode || null
    };
  }
}