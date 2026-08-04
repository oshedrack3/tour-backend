const express = require("express");
const bcrypt = require("bcrypt");
const { v4: uuid } = require("uuid");

const db = require("./firebase");

const router = express.Router();

router.post("/register", async (req, res) => {
  
  try {
    
    const {
      username,
      email,
      password,
      role
    } = req.body;
    
    if (!username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields."
      });
    }
    
    if (!["admin", "player"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role."
      });
    }
    
    const usersSnapshot = await db.ref("users").once("value");
    const users = usersSnapshot.val() || {};
    
    const usernameExists = Object.values(users).some(
      user => user.username.toLowerCase() === username.toLowerCase()
    );
    
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        message: "Username already exists."
      });
    }
    
    const emailExists = Object.values(users).some(
      user => user.email.toLowerCase() === email.toLowerCase()
    );
    
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: "Email already exists."
      });
    }
    
    const uid = uuid();
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = {
      uid,
      username,
      email,
      password: hashedPassword,
      role,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastLogin: null,
      status: "active"
    };
    
    await db.ref(`users/${uid}`).set(user);
    
    delete user.password;
    
    res.status(201).json({
      success: true,
      user
    });
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
  
});



router.post("/login", async (req, res) => {
  try {
    
    const { login, password } = req.body;
    
    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "Login and password are required."
      });
    }
    
    const snapshot = await db.ref("users").once("value");
    const users = snapshot.val() || {};
    
    const user = Object.values(users).find(u =>
      u.username.toLowerCase() === login.toLowerCase() ||
      u.email.toLowerCase() === login.toLowerCase()
    );
    
    if (!user) {
  return res.status(404).json({
    success: false,
    title: "Account Not Found",
    message: "No account exists with these login details."
  });
}    
    
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        title: "Invalid Password",
  message: "The Password is incorrect, Please check and try again."
      });
    }
    
    await db.ref(`users/${user.uid}`).update({
      lastLogin: Date.now()
    });
    
    delete user.password;
    
    const token = uuid();
    
    await db.ref(`sessions/${token}`).set({
      uid: user.uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
      active: true
    });
    
    delete user.password;
    
    res.json({
      success: true,
      token,
      user
    });
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
});


router.post("/logout", async (req, res) => {
  
  try {
    
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required."
      });
    }
    
    const sessionRef = db.ref(`sessions/${token}`);
    
    const snapshot = await sessionRef.once("value");
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Session not found."
      });
    }
    
    await sessionRef.remove();
    
    res.json({
      success: true,
      message: "Logged out successfully."
    });
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
  
});

router.post("/verify", async (req, res) => {
  
  try {
    
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required."
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
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }
    
    const user = userSnapshot.val();
    
    delete user.password;
    
    res.json({
      success: true,
      user
    });
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
  
});


module.exports = router;