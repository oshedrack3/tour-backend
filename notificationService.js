const db = require("./firebase");
const { sendNotification } = require("./notifications");
const { v4: uuid } = require("uuid");


async function createNotification({
  userId,
  type,
  title,
  message,
  tournamentId = null
}) {
  
  const notificationId = uuid();
  
  const notification = {
    id: notificationId,
    
    type,
    title,
    message,
    
    tournamentId,
    
    read: false,
    
    createdAt: Date.now()
  };
  
  
  await db
    .ref(`notifications/${userId}/${notificationId}`)
    .set(notification);
  
  
  sendNotification(
    userId,
    notification
  );
  
  
  return notification;
}


module.exports = {
  createNotification
};