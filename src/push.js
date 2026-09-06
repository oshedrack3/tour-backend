import webpush from "web-push";

export function getWebPush(env) {
  if (
    !env.VAPID_SUBJECT ||
    !env.VAPID_PUBLIC_KEY ||
    !env.VAPID_PRIVATE_KEY
  ) {
    throw new Error(
      "VAPID configuration is missing."
    );
  }
  
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  
  return webpush;
}