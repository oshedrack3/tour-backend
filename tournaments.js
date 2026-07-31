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
      
      players: {},
      
      teams: {},
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
      result = Object.values(tournaments).filter(t => {
  const player = t.players?.[user.uid];
  
  return (
    player &&
    (
      player.status === "pending" ||
      player.status === "accepted"
    )
  );
});
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
      return res.status(400).json({ success: false, message: "Update data is required." });
    }
    
    const snapshot = await db.ref(`tournaments/${id}`).once("value");
    if (!snapshot.exists()) return res.status(404).json({ success: false, message: "Tournament not found." });
    
    const tournament = snapshot.val();
    if (tournament.adminUid !== user.uid) return res.status(403).json({ success: false, message: "Access denied." });
    
    if (updates) {
      updates.updatedAt = Date.now();
      
      
      const updatePayload = {};
      for (const key in updates) {
        if (key === 'teams' || key === 'teamLogos') {
          
          for (const teamId in updates[key]) {
            updatePayload[`teams/${teamId}`] = updates[key][teamId];
          }
        } else if (key === 'teamLogos') {
          for (const name in updates[key]) {
            updatePayload[`teamLogos/${name}`] = updates[key][name];
          }
        } else {
          updatePayload[key] = updates[key];
        }
      }
      
      await db.ref(`tournaments/${id}`).update(updatePayload);
    } else {
      await db.ref(`tournaments/${id}/${path}`).set(value);
      await db.ref(`tournaments/${id}/updatedAt`).set(Date.now());
    }
    
    res.json({ success: true });
    
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/:id/team-logo", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const id = req.params.id;
    const { logo, teamName } = req.body;
    
    if (!logo || !teamName) {
      return res.status(400).json({
        success: false,
        message: "Logo and team name are required."
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
    
    const imageUrl = await uploadBase64Image(
      logo,
      "team-logos",
      `${id}_${teamName}`
    );
    
    res.json({
      success: true,
      imageUrl
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
    const user = req.user;
    const id = req.params.id;
    
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
    
    await db.ref(`tournaments/${id}`).remove();
    
    res.json({
      success: true,
      message: "Tournament deleted successfully."
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

router.post("/:id/invite", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    
    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: "Username is required."
      });
    }
    
    
    const tournamentSnap = await db.ref(`tournaments/${id}`).once("value");
    
    if (!tournamentSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found."
      });
    }
    
    const tournament = tournamentSnap.val();
    
    
    if (tournament.adminUid !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Only the tournament admin can invite players."
      });
    }
    
    
    const usersSnap = await db.ref("users").once("value");
    
    let invitedUid = null;
    let invitedUser = null;
    
    usersSnap.forEach(child => {
      const user = child.val();
      
      if (
        user.username &&
        user.username.trim().toLowerCase() ===
        username.trim().toLowerCase()
      ) {
        invitedUid = child.key;
        invitedUser = user;
      }
    });
    
    if (!invitedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }
    
    
    if (invitedUid === req.user.uid) {
      return res.status(400).json({
        success: false,
        message: "You cannot invite yourself."
      });
    }
    
    tournament.players = tournament.players || {};
    
    
    if (tournament.players[invitedUid]) {
      return res.status(400).json({
        success: false,
        message: "Player already invited."
      });
    }
    
    
    tournament.players[invitedUid] = {
      uid: invitedUid,
      username: invitedUser.username,
      status: "pending",
      invitedAt: Date.now()
    };
    
    await db
      .ref(`tournaments/${id}/players`)
      .set(tournament.players);
    
    return res.json({
      success: true,
      message: "Invitation sent successfully."
    });
    
  } catch (err) {
    console.error(err);
    
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to invite player."
    });
  }
});
router.post("/:id/respond", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    
    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid response."
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
    
    if (
      !tournament.players ||
      !tournament.players[req.user.uid]
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not invited to this tournament."
      });
    }
    
    if (action === "accept") {
      tournament.players[req.user.uid].status = "accepted";
      tournament.players[req.user.uid].joinedAt = Date.now();
    } else {
      tournament.players[req.user.uid].status = "declined";
      tournament.players[req.user.uid].respondedAt = Date.now();
    }
    
    await db
      .ref(`tournaments/${id}/players`)
      .set(tournament.players);
    
    res.json({
      success: true,
      status: tournament.players[req.user.uid].status
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


module.exports = router;