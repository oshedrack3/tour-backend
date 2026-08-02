const express = require("express");
const authenticate = require("./middleware");
const db = require("./firebase");

const {
  addNotificationClient,
  removeNotificationClient
} = require("./notifications");


const router = express.Router();



router.get("/events", authenticate, (req, res) => {
  
  const userId = req.user.uid;
  
  
  res.setHeader(
    "Content-Type",
    "text/event-stream"
  );
  
  res.setHeader(
    "Cache-Control",
    "no-cache"
  );
  
  res.setHeader(
    "Connection",
    "keep-alive"
  );
  
  
  res.flushHeaders();
  
  
  addNotificationClient(
    userId,
    res
  );
  
  
  res.write(
    `event: connected\n` +
    `data: ${JSON.stringify({
      success: true
    })}\n\n`
  );
  
  
  req.on("close", () => {
    
    removeNotificationClient(
      userId,
      res
    );
    
  });
  
});




router.get("/", authenticate, async (req, res) => {
  
  try {
    
    const userId = req.user.uid;
    
    
    const snapshot =
      await db
      .ref(`notifications/${userId}`)
      .once("value");
    
    
    const data = snapshot.val() || {};
    
    
    const notifications =
      Object.values(data)
      .sort(
        (a, b) =>
        b.createdAt - a.createdAt
      );
    
    
    res.json({
      success: true,
      notifications
    });
    
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
  
});




router.patch("/:id/read", authenticate, async (req, res) => {
  
  try {
    
    const userId = req.user.uid;
    const id = req.params.id;
    
    
    await db
      .ref(
        `notifications/${userId}/${id}/read`
      )
      .set(true);
    
    
    res.json({
      success: true
    });
    
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
  
});



router.patch("/read-all", authenticate, async (req, res) => {
  
  try {
    
    const userId = req.user.uid;
    
    
    const snapshot =
      await db
      .ref(`notifications/${userId}`)
      .once("value");
    
    
    const notifications =
      snapshot.val();
    
    
    if (notifications) {
      
      const updates = {};
      
      
      Object.keys(notifications)
        .forEach(id => {
          
          updates[
            `notifications/${userId}/${id}/read`
          ] = true;
          
        });
      
      
      await db
        .ref()
        .update(updates);
      
    }
    
    
    res.json({
      success: true
    });
    
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
  
});


module.exports = router;