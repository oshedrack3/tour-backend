import {
  getPushSubscription,
  deletePushSubscription
} from "./storage.js";

import {
  getWebPush
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
      endpoint:
        subscription.endpoint,
      keys: {
        p256dh:
          subscription.p256dh,
        auth:
          subscription.auth
      }
    };

    const payload =
      JSON.stringify({
        title,
        body,
        url
      });

    const webpush =
      getWebPush(env);

    await webpush.sendNotification(
      pushSubscription,
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
      await deletePushSubscription(
        env.DB,
        userId
      );
    }

    return {
      success: false,
      reason: "Push failed"
    };
  }
}