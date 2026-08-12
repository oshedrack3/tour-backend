const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("./firebase");
const authenticate = require("./middleware");
const {
  uploadBase64Image,
  deleteCloudinaryImage
} = require("./cloudinary");
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
  
  tournamentCount: 0,
  
  activeSeasons: 0,
  
  visibility: "public",
  
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
    
    const competitionsSnapshot = await db
      .ref("competitions")
      .once("value");
    
    const competitions = competitionsSnapshot.val() || {};
    
    const tournamentsSnapshot = await db
      .ref("tournaments")
      .once("value");
    
    const tournaments = tournamentsSnapshot.val() || {};
    
    const result = [];
    
    for (const competition of Object.values(competitions)) {
      if (competition.adminUid !== user.uid) continue;
      
      let updatedCompetition = competition;
      
      if (
        typeof competition.tournamentCount !== "number" ||
        typeof competition.activeSeasons !== "number"
      ) {
        const competitionTournaments = Object.values(tournaments)
          .filter(tournament =>
            tournament.competitionId === competition.id
          );
        
        const tournamentCount = competitionTournaments.length;
        
        const activeSeasons = competitionTournaments.filter(tournament => {
          if (!tournament.endDate) return false;
          
          return new Date(tournament.endDate) >= new Date();
        }).length;
        
        updatedCompetition = {
          ...competition,
          tournamentCount,
          activeSeasons
        };
        
        await db
          .ref(`competitions/${competition.id}`)
          .update({
            tournamentCount,
            activeSeasons
          });
      }
      
      result.push(updatedCompetition);
    }
    
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

router.get("/public", authenticate, async (req, res) => {
  try {
    const competitionsSnapshot = await db
      .ref("competitions")
      .once("value");
    
    const competitions = competitionsSnapshot.val() || {};
    
    const result = Object.values(competitions).filter(
      competition => competition.visibility === "public"
    );
    
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
    
    
    
    const isOwner = competition.adminUid === req.user.uid;

if (
  !isOwner &&
  competition.visibility !== "public"
) {
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
      if (Object.keys(updates).some(k => k.startsWith("teams/"))) {
        rebuildTableFromMatches(tournament);
        updates.table = tournament.table;
        updates.prevRanks = tournament.prevRanks || {};
      }
      
      await db.ref(`tournaments/${id}`).update(updates);
    } else {
      
      await db.ref(`tournaments/${id}/${path}`).set(value);
      await db.ref(`tournaments/${id}/updatedAt`).set(Date.now());
    }
    sendTournamentUpdate(id, {
      type: "TOURNAMENT_UPDATED"
    });
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