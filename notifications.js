const notificationClients = new Map();

function addNotificationClient(userId, res) {
  if (!notificationClients.has(userId)) {
    notificationClients.set(userId, new Set());
  }
  
  notificationClients.get(userId).add(res);
}

function removeNotificationClient(userId, res) {
  const list = notificationClients.get(userId);
  
  if (!list) return;
  
  list.delete(res);
  
  if (list.size === 0) {
    notificationClients.delete(userId);
  }
}

function sendNotification(userId, notification) {
  const list = notificationClients.get(userId);
  
  if (!list) return;
  
  const payload =
    `event: notification\n` +
    `data: ${JSON.stringify(notification)}\n\n`;
  
  list.forEach(res => {
    try {
      res.write(payload);
    } catch (err) {
      removeNotificationClient(userId, res);
      res.end();
    }
  });
}

setInterval(() => {
  for (const [userId, list] of notificationClients.entries()) {
    list.forEach(res => {
      try {
        res.write(": ping\n\n");
      } catch (err) {
        removeNotificationClient(userId, res);
        res.end();
      }
    });
  }
}, 25000);

module.exports = {
  addNotificationClient,
  removeNotificationClient,
  sendNotification
};

