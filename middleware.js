const db = require("./firebase");

async function authenticate(req, res, next) {
  
  try {
    
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }
    
    const sessionSnapshot = await db.ref(`sessions/${token}`).once("value");
    
    if (!sessionSnapshot.exists()) {
      return res.status(401).json({
        success: false,
        message: "Invalid session."
      });
    }
    
    const session = sessionSnapshot.val();
    
    if (!session.active) {
      return res.status(401).json({
        success: false,
        message: "Session inactive."
      });
    }
    
    if (Date.now() > session.expiresAt) {
      await db.ref(`sessions/${token}`).remove();
      
      return res.status(401).json({
        success: false,
        message: "Session expired."
      });
    }
    
    const userSnapshot = await db.ref(`users/${session.uid}`).once("value");
    
    if (!userSnapshot.exists()) {
      return res.status(401).json({
        success: false,
        message: "User not found."
      });
    }
    
    req.user = userSnapshot.val();
    req.token = token;
    
    next();
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
  
}

module.exports = authenticate;

// end