const webpush = require("web-push");

console.log(
  "VAPID_PUBLIC_KEY exists:",
  !!process.env.VAPID_PUBLIC_KEY
);

console.log(
  "VAPID_PUBLIC_KEY length:",
  process.env.VAPID_PUBLIC_KEY?.length
);

console.log(
  "VAPID_PRIVATE_KEY exists:",
  !!process.env.VAPID_PRIVATE_KEY
);

console.log(
  "VAPID_PRIVATE_KEY length:",
  process.env.VAPID_PRIVATE_KEY?.length
);

console.log(
  "VAPID_SUBJECT:",
  process.env.VAPID_SUBJECT
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = webpush;