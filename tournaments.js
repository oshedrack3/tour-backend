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
        message: "Only admins can create tournaments."
      });
    }
    
    const {
      name,
      format,
      startDate,
      endDate,
      matchDays,
      tournamentImage
    } = req.body;
    
    if (!name || !format) {
      return res.status(400).json({
        success: false,
        message: "Name and format are required."
      });
    }
    
    const id = uuid();
    let imageUrl = null;
    
    if (tournamentImage) {
      imageUrl = await uploadBase64Image(
        tournamentImage,
        "tournaments",
        id
      );
    }
    
    const tournament = {
      id,
      name,
      format,
      
      createdAt: Date.now(),
      updatedAt: Date.now(),
      
      adminUid: user.uid,
      
      startDate,
      endDate,
      matchDays: matchDays || [],
      
      tournamentImage: imageUrl,
      
      teams: [],
      matches: [],
      table: [],
      
      groups: [],
      groupMatches: [],
      qualifiedTeams: [],
      knockoutMatches: [],
      
      teamLogos: {},
      
      settings: {
        knockoutSize: 0,
        teamsPerGroup: 0,
        qualifiersPerGroup: 0
      }
    };
    
    await db.ref(`tournaments/${id}`).set(tournament);
    
    res.json({
      success: true,
      tournament
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
    
    const snapshot = await db.ref("tournaments").once("value");
    const tournaments = snapshot.val() || {};
    
    let result = [];
    
    if (user.role === "admin") {
      result = Object.values(tournaments).filter(
        t => t.adminUid === user.uid
      );
    } else {
      const teamSnapshot = await db.ref("teams").once("value");
      const teams = teamSnapshot.val() || {};
      
      const myTeam = Object.values(teams).find(
        team => team.ownerUid === user.uid
      );
      
      if (myTeam) {
        result = Object.values(tournaments).filter(
          t => t.teams && t.teams[myTeam.id]
        );
      }
    }
    
    res.json({
      success: true,
      tournaments: result
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

router.patch("/:id", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const id = req.params.id;
    
    const { path, value, updates } = req.body;
    
    if (!path && !updates) {
      return res.status(400).json({
        success: false,
        message: "Update data is required."
      });
    }
    
    const snapshot = await db.ref(`tournaments/${id}`).once("value");
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found."
      });
    }
    
    const tournament = snapshot.val();
    
    if (tournament.adminUid !== user.uid) {
      return res.status(403).json({
        success: false,
        message: "Access denied."
      });
    }
    
    if (updates) {
      updates.updatedAt = Date.now();
      await db.ref(`tournaments/${id}`).update(updates);
    } else {
      await db.ref(`tournaments/${id}/${path}`).set(value);
      await db.ref(`tournaments/${id}/updatedAt`).set(Date.now());
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