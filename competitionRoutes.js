const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("./firebase");
const authenticate = require("./middleware");
const { uploadBase64Image } = require("./cloudinary");

const router = express.Router();


router.post("/create", authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can create competitions."
      });
    }
    
    
    const {
      name,
      logo
    } = req.body;
    
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Competition name is required."
      });
    }
    
    
    const id = uuid();
    
    let logoUrl = null;
    
    
    if (logo) {
      logoUrl = await uploadBase64Image(
        logo,
        "competitions",
        id
      );
    }
    
    
    const competition = {
      id,
      
      name: name.trim(),
      
      logo: logoUrl,
      
      adminUid: user.uid,
      
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    
    await db
      .ref(`competitions/${id}`)
      .set(competition);
    
    
    res.json({
      success: true,
      competition
    });
    
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
});



router.get("/my", authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    
    const snapshot = await db
      .ref("competitions")
      .once("value");
    
    
    const competitions = snapshot.val() || {};
    
    
    const result = Object.values(competitions)
      .filter(c => c.adminUid === user.uid);
    
    
    
    res.json({
      success: true,
      competitions: result
    });
    
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
});



router.get("/:id", authenticate, async (req, res) => {
  try {
    
    const { id } = req.params;
    
    
    const snapshot = await db
      .ref(`competitions/${id}`)
      .once("value");
    
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Competition not found."
      });
    }
    
    
    const competition = snapshot.val();
    
    
    
    if (competition.adminUid !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Access denied."
      });
    }
    
    
    res.json({
      success: true,
      competition
    });
    
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
});



router.delete("/:id", authenticate, async (req, res) => {
  try {
    
    const { id } = req.params;
    
    
    const snapshot = await db
      .ref(`competitions/${id}`)
      .once("value");
    
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Competition not found."
      });
    }
    
    
    const competition = snapshot.val();
    
    
    
    if (competition.adminUid !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Access denied."
      });
    }
    
    
    await db
      .ref(`competitions/${id}`)
      .remove();
    
    
    
    res.json({
      success: true,
      message: "Competition deleted."
    });
    
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
});


module.exports = router;