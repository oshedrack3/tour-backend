const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("./firebase");
const authenticate = require("./middleware");
const { uploadBase64Image } = require("./cloudinary");

const router = express.Router();
const PERMISSIONS = {
  admin: [
    "teams",
    "teamLogos",
    "matches",
    "table",
    "groups",
    "groupMatches",
    "qualifiedTeams",
    "knockoutMatches",
    "settings",
    "players",
    "matchSubmissions"
  ],
  
  player: [
    "teams",
    "teamLogos",
    "matchSubmissions"
  ]
};

function canUpdate(role, key) {
  const root = key.split("/")[0];
  return PERMISSIONS[role]?.includes(root);
}


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
      player.status === "accepted" ||
      player.hasNewInvitation === true
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
    
    const isAdmin = tournament.adminUid === user.uid;
    const role = isAdmin ? "admin" : "player";
    
    if (!isAdmin) {
      const player = tournament.players?.[user.uid];
      
      if (!player || player.status !== "accepted") {
        return res.status(403).json({
          success: false,
          message: "Access denied."
        });
      }
      
      if (!updates) {
        return res.status(403).json({
          success: false,
          message: "Access denied."
        });
      }
      
      const allowed = Object.keys(updates).every(key =>
        canUpdate(role, key)
      );
      
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Access denied."
        });
      }
      
      const validation = validateTeamUpdate(
        tournament,
        user,
        updates
      );
      
      if (!validation.success) {
        return res.status(403).json(validation);
      }
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

function validateTeamUpdate(tournament, user, updates) {
  for (const key of Object.keys(updates)) {
    if (!key.startsWith("teams/")) continue;
    
    const teamId = key.split("/")[1];
    const existingTeam = tournament.teams?.[teamId];
    const incomingTeam = updates[key];
    
    if (existingTeam) {
      if (existingTeam.ownerUid !== user.uid) {
        return {
          success: false,
          message: "You do not own this team."
        };
      }
      
      continue;
    }
    
    const alreadyOwnsTeam = Object.values(tournament.teams || {}).some(
      team => team.ownerUid === user.uid
    );
    
    if (alreadyOwnsTeam) {
      return {
        success: false,
        message: "You have already registered a team."
      };
    }
    
    const duplicateName = Object.values(tournament.teams || {}).some(
      team =>
      team.name &&
      incomingTeam.name &&
      team.name.trim().toLowerCase() ===
      incomingTeam.name.trim().toLowerCase()
    );
    
    if (duplicateName) {
      return {
        success: false,
        message: "A team with this name already exists."
      };
    }
    
    if (incomingTeam.ownerUid !== user.uid) {
      return {
        success: false,
        message: "Invalid owner."
      };
    }
  }
  
  return {
    success: true
  };
}



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
    
    const isAdmin = tournament.adminUid === user.uid;
    
    const isAcceptedPlayer =
      tournament.players &&
      tournament.players[user.uid] &&
      tournament.players[user.uid].status === "accepted";
    
    if (!isAdmin && !isAcceptedPlayer) {
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
    
    const existing = tournament.players[invitedUid];
    
    if (existing) {
      if (existing.status === "accepted") {
        return res.status(400).json({
          success: false,
          message: "Player is already part of this tournament."
        });
      }
      
      if (
        existing.status === "pending" &&
        existing.hasNewInvitation
      ) {
        return res.status(400).json({
          success: false,
          message: "Invitation already pending."
        });
      }
      
      if (existing.status === "declined") {
        existing.hasNewInvitation = true;
        existing.invitedAt = Date.now();
        existing.invitationCount =
          (existing.invitationCount || 1) + 1;
        
        await db
          .ref(`tournaments/${id}/players`)
          .set(tournament.players);
        
        return res.json({
          success: true,
          message: "Invitation sent again successfully."
        });
      }
    }
    
    tournament.players[invitedUid] = {
      uid: invitedUid,
      username: invitedUser.username,
      
      status: "pending",
      
      invitedAt: Date.now(),
      
      hasNewInvitation: true,
      
      invitationCount: 1
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
    
    const player = tournament.players[req.user.uid];
    
    if (!player.hasNewInvitation) {
      return res.status(400).json({
        success: false,
        message: "No pending invitation."
      });
    }
    
    if (action === "accept") {
      player.status = "accepted";
      player.joinedAt = Date.now();
    } else {
      player.status = "declined";
      player.respondedAt = Date.now();
    }
    
    player.hasNewInvitation = false;
    
    await db
      .ref(`tournaments/${id}/players`)
      .set(tournament.players);
    
    res.json({
      success: true,
      status: player.status
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
    const user = req.user;
    
    const snapshot = await db.ref(`tournaments/${id}`).once("value");
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found."
      });
    }
    
    const tournament = snapshot.val();
    
    const isAdmin = tournament.adminUid === user.uid;
    
    const isAcceptedPlayer =
      tournament.players &&
      tournament.players[user.uid] &&
      tournament.players[user.uid].status === "accepted";
    
    if (!isAdmin && !isAcceptedPlayer) {
      return res.status(403).json({
        success: false,
        message: "Access denied."
      });
    }
    
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


module.exports = router;