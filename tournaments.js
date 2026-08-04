const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("./firebase");
const authenticate = require("./middleware");
const {
  uploadBase64Image,
  deleteCloudinaryImage
} = require("./cloudinary");

const { createNotification } = require("./notificationService");
const {
  addClient,
  removeClient,
  sendTournamentUpdate
} = require("./events");

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
      tournamentImage,
      competitionId,
      season
    } = req.body;
    
    
    if (!name || !format) {
      return res.status(400).json({
        success: false,
        message: "Name and format are required."
      });
    }
    
    
    if (!competitionId) {
      return res.status(400).json({
        success: false,
        message: "Competition is required."
      });
    }
    
    
    if (!season) {
      return res.status(400).json({
        success: false,
        message: "Season is required."
      });
    }
    
    
    const id = uuid();
    
    let image = null;
    
    
    if (tournamentImage) {
      image = await uploadBase64Image(
        tournamentImage,
        "tournaments",
        id
      );
    }
    
    
    const tournament = {
      id,
      
      competitionId,
      
      name,
      season,
      format,
      
      seasonStatus: "upcoming",
      
      champion: null,
      
      createdAt: Date.now(),
      updatedAt: Date.now(),
      
      adminUid: user.uid,
      
      startDate,
      endDate,
      matchDays: matchDays || [],
      
      tournamentImage: image,
      
      players: {},
      matchSubmissions: {},
      
      teams: {},
      teamLogos: {},
      
      matches: [],
      table: [],
      
      groups: [],
      groupMatches: [],
      qualifiedTeams: [],
      knockoutMatches: [],
      
      settings: {
        knockoutSize: 0,
        teamsPerGroup: 0,
        qualifiersPerGroup: 0
      }
    };
    
    
    await db
      .ref(`tournaments/${id}`)
      .set(tournament);
    
    
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
    const { logo, teamName, teamId } = req.body;
    
    if (!logo || !teamName || !teamId) {
  return res.status(400).json({
    success: false,
    message: "Logo, team name and team ID are required."
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
   
   const oldLogo = tournament.teamLogos?.[teamId];

if (oldLogo?.publicId) {
  await deleteCloudinaryImage(
    oldLogo.publicId
  );
}

    const image = await uploadBase64Image(
  logo,
  "team-logos",
  `${id}_${teamId}`
);    
    res.json({
      success: true,
      image
    });
    
  } catch (err) {
    res.status(400).json({
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
    
    if (tournament.tournamentImage?.publicId) {
      await deleteCloudinaryImage(
        tournament.tournamentImage.publicId
      );
    }
    
    for (const logo of Object.values(tournament.teamLogos || {})) {
      if (logo?.publicId) {
        await deleteCloudinaryImage(
          logo.publicId
        );
      }
    }
    
    for (const submission of Object.values(
        tournament.matchSubmissions || {}
      )) {
      if (submission.screenshotPublicId) {
        await deleteCloudinaryImage(
          submission.screenshotPublicId
        );
      }
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
          sendTournamentUpdate(id, {
  type: "TOURNAMENT_UPDATED"
});
      await createNotification({
  userId: invitedUid,
  type: "invitation",
  title: "Tournament Invitation",
  message: `${req.user.username} invited you to join ${tournament.name}.`,
  tournamentId: id
});  
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
      
    await createNotification({
  userId: invitedUid,
  type: "invitation",
  title: "Tournament Invitation",
  message: `${req.user.username} invited you to join ${tournament.name}.`,
  tournamentId: id
});

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
    sendTournamentUpdate(id, {
  type: "TOURNAMENT_UPDATED"
});
    await createNotification({
  userId: tournament.adminUid,
  type: "invitation_response",
  title: "Invitation Response",
  message: `${req.user.username} ${
    action === "accept"
      ? "accepted"
      : "declined"
  } your tournament invitation.`,
  tournamentId: id
});

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

function rebuildTableFromMatches(tournament) {
  
  if (!tournament) return;
  
  let teamsObj = tournament.teams || {};
  const matches = tournament.matches || [];
  
  
  if (Array.isArray(teamsObj)) {
    
    const converted = {};
    
    teamsObj.forEach(name => {
      
      converted[name] = {
        id: name,
        name,
        logo: tournament.teamLogos?.[name] || null
      };
      
    });
    
    teamsObj = converted;
    
  }
  
  const prevRanks = tournament.prevRanks || {};
  
  const table = {};
  
  Object.values(teamsObj).forEach(team => {
    
    table[team.name] = {
      id: team.id,
      name: team.name,
      logo: team.logo || tournament.teamLogos?.[team.name] || null,
      
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      
      gf: 0,
      ga: 0,
      gd: 0,
      
      pts: 0,
      
      change: "same"
    };
    
  });
  
  matches.forEach(match => {
    
    if (!match.played) return;
    
    const home = table[match.home];
    const away = table[match.away];
    
    if (!home || !away) return;
    
    const hg = Number(match.homeGoals || 0);
    const ag = Number(match.awayGoals || 0);
    
    home.played++;
    away.played++;
    
    home.gf += hg;
    home.ga += ag;
    
    away.gf += ag;
    away.ga += hg;
    
    if (hg > ag) {
      
      home.wins++;
      away.losses++;
      home.pts += 3;
      
    } else if (ag > hg) {
      
      away.wins++;
      home.losses++;
      away.pts += 3;
      
    } else {
      
      home.draws++;
      away.draws++;
      
      home.pts += 1;
      away.pts += 1;
      
    }
    
  });
  
  Object.values(table).forEach(team => {
    
    team.gd = team.gf - team.ga;
    
  });
  
  const sortedTable = Object.values(table).sort((a, b) => {
    
    if (b.pts !== a.pts) return b.pts - a.pts;
    
    if (b.gd !== a.gd) return b.gd - a.gd;
    
    return b.gf - a.gf;
    
  });
  
  sortedTable.forEach((team, index) => {
    
    const oldRank = prevRanks[team.name];
    
    if (oldRank !== undefined) {
      
      if (index < oldRank) {
        
        team.change = "up";
        
      } else if (index > oldRank) {
        
        team.change = "down";
        
      } else {
        
        team.change = "same";
        
      }
      
    }
    
  });
  
  const newRanks = {};
  
  sortedTable.forEach((team, index) => {
    
    newRanks[team.name] = index;
    
  });
  
  tournament.table = sortedTable;
  tournament.prevRanks = newRanks;
  
  return tournament;
  
}


router.post("/:id/match-submission/:submissionId/review", authenticate, async (req, res) => {
  try {
    
    const { id, submissionId } = req.params;
    const { action, rejectionReason = "" } = req.body;
    
    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action."
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
    
    if (tournament.adminUid !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Only the tournament admin can review submissions."
      });
    }
    
    tournament.matchSubmissions ||= {};
    
    const submission = tournament.matchSubmissions[submissionId];
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found."
      });
    }
    
    if (submission.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Submission already reviewed."
      });
    }
    
    submission.status = action;
    submission.reviewedAt = Date.now();
    submission.reviewedBy = req.user.uid;
    
    if (action === "rejected") {
      
      submission.rejectionReason = rejectionReason;
      
    } else {
      
      const match = (tournament.matches || []).find(
        m => String(m.id) === String(submission.matchId)
      );
      
      if (!match) {
        return res.status(404).json({
          success: false,
          message: "Match not found."
        });
      }
      
      match.homeGoals = Number(submission.homeGoals);
      match.awayGoals = Number(submission.awayGoals);
      match.played = true;
      match.playedAt = Date.now();
      
      rebuildTableFromMatches(tournament);
    }
    
    tournament.updatedAt = Date.now();
    
    await db.ref(`tournaments/${id}`).update({
      matches: tournament.matches,
      table: tournament.table,
      prevRanks: tournament.prevRanks || {},
      records: tournament.records || {},
      matchSubmissions: tournament.matchSubmissions,
      updatedAt: tournament.updatedAt
    });
    sendTournamentUpdate(id, {
  type: "TOURNAMENT_UPDATED"
});
    await createNotification({
  userId: submission.submittedBy,
  type: action === "approved" ?
    "submission_approved" :
    "submission_rejected",
  
  title: action === "approved" ?
    "Submission Approved" :
    "Submission Rejected",
  
  message: action === "approved" ?
    "Your match result has been approved." :
    `Your submission was rejected. Reason: ${rejectionReason}`,
  
  tournamentId: id
});
    res.json({
      success: true,
      submission,
      matches: tournament.matches,
      table: tournament.table,
      prevRanks: tournament.prevRanks || {},
      records: tournament.records || {},
      matchSubmissions: tournament.matchSubmissions
    });
    
  } catch (err) {
    
    res.status(500).json({
      success: false,
      message: err.message
    });
    
  }
});



router.get("/:id/match-submissions", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const snapshot = await db.ref(`tournaments/${id}`).once("value");
    
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, message: "Tournament not found." });
    }
    
    const tournament = snapshot.val();
    
    const isAdmin = tournament.adminUid === req.user.uid;
    const player = tournament.players?.[req.user.uid];
    
    if (!isAdmin && (!player || player.status !== "accepted")) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    
    const players = tournament.players || {};
    
    const submissions = Object.values(tournament.matchSubmissions || {}).map(s => {
      const submitter = players[s.submittedBy] || {};
      
      return {
        id: s.id,
        matchId: s.matchId,
        submittedBy: submitter.name || submitter.username || "Unknown Player",
        homeGoals: s.homeGoals,
        awayGoals: s.awayGoals,
        screenshot: s.screenshot,
        status: s.status,
        createdAt: s.createdAt,
        reviewedAt: s.reviewedAt,
        rejectionReason: s.rejectionReason
      }
    });
    
    res.json({
      success: true,
      submissions
    });
    
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/:id/rebuild-table", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const snapshot = await db
      .ref(`tournaments/${id}`)
      .once("value");
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found."
      });
    }
    
    const tournament = snapshot.val();
    
    if (tournament.adminUid !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Only admin can rebuild table."
      });
    }
    
    rebuildTableFromMatches(tournament);
    
    await db.ref(`tournaments/${id}`).update({
      table: tournament.table,
      prevRanks: tournament.prevRanks || {},
      updatedAt: Date.now()
    });
    sendTournamentUpdate(id, {
  type: "TOURNAMENT_UPDATED"
});
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

router.post("/:id/match-submission", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const {
      matchId,
      homeGoals,
      awayGoals,
      screenshot
    } = req.body;
    
    const snapshot = await db.ref(`tournaments/${id}`).once("value");
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found."
      });
    }
    
    const tournament = snapshot.val();
    
    const player = tournament.players?.[req.user.uid];
    
    if (!player || player.status !== "accepted") {
      return res.status(403).json({
        success: false,
        message: "Only accepted players can submit results."
      });
    }
    
    const playerTeam = Object.values(tournament.teams || {}).find(
      team => team.ownerUid === req.user.uid
    );
    
    if (!playerTeam) {
      return res.status(403).json({
        success: false,
        message: "You have not registered a team."
      });
    }
    
    const match = (tournament.matches || []).find(
      m => String(m.id) === String(matchId)
    );
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found."
      });
    }
    
    if (
      match.home !== playerTeam.name &&
      match.away !== playerTeam.name
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only submit results for your own team's matches."
      });
    }
    
    if (match.played) {
      return res.status(400).json({
        success: false,
        message: "This match has already been played."
      });
    }
    
    tournament.matchSubmissions =
      tournament.matchSubmissions || {};
    
    const existingSubmission = Object.values(
      tournament.matchSubmissions
    ).find(
      s =>
      String(s.matchId) === String(matchId) &&
      s.status === "pending"
    );
    
    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: "A submission for this match is already awaiting review."
      });
    }
    
    const submissionId = uuid();
    
   let screenshotUrl = null;
let screenshotPublicId = null;

if (screenshot) {
  const uploadedImage = await uploadBase64Image(
    screenshot,
    "match-screenshots",
    `${id}_${submissionId}`
  );
  
  screenshotUrl = uploadedImage.url;
  screenshotPublicId = uploadedImage.publicId;
}

tournament.matchSubmissions[submissionId] = {
  id: submissionId,
  
  matchId,
  
  submittedBy: req.user.uid,
  username: req.user.username,
  
  homeGoals: Number(homeGoals),
  awayGoals: Number(awayGoals),
  
  screenshot: screenshotUrl,
  screenshotPublicId,
  
  status: "pending",
  
  createdAt: Date.now()
};

    await db
      .ref(`tournaments/${id}/matchSubmissions`)
      .set(tournament.matchSubmissions);
    
    await db
      .ref(`tournaments/${id}/updatedAt`)
      .set(Date.now());
    
    sendTournamentUpdate(id, {
      type: "TOURNAMENT_UPDATED"
    });
    
    await createNotification({
      userId: tournament.adminUid,
      type: "match_submission",
      title: "New Match Submission",
      message: `${req.user.username} submitted a match result.`,
      tournamentId: id
    });
    
    res.json({
      success: true,
      submissionId,
      screenshot: screenshotUrl
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


router.get("/:id/events", authenticate, async (req, res) => {
  
  const tournamentId = req.params.id;
  
  
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
  
  
  addClient(tournamentId, res);
  
  
  res.write(
    `event: connected\n` +
    `data: {"success":true}\n\n`
  );
  
  
  req.on("close", () => {
    
    removeClient(
      tournamentId,
      res
    );
    
  });
  
});

router.patch("/:id/team/:teamId", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id, teamId } = req.params;
    const { name, logo } = req.body;
    
    const snapshot = await db.ref(`tournaments/${id}`).once("value");
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found."
      });
    }
    
    const tournament = snapshot.val();
    
    const team = tournament.teams?.[teamId];
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found."
      });
    }
    
    const isAdmin = tournament.adminUid === user.uid;
    
    const isOwner =
      team.ownerUid === user.uid;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Access denied."
      });
    }
    
    const updates = {};
    
    let newLogo = team.logo;
    
    if (logo) {
      
      const oldLogo = tournament.teamLogos?.[team.name];
      
      if (oldLogo?.publicId) {
        await deleteCloudinaryImage(
          oldLogo.publicId
        );
      }
      
      const uploaded = await uploadBase64Image(
        logo,
        "team-logos",
        `${id}_${teamId}_${name}`
      );
      
      newLogo = uploaded.url;
      
      updates[`teamLogos/${name}`] = uploaded;
    }
    
    if (name && name !== team.name) {
      
      const duplicate = Object.values(tournament.teams)
        .some(t =>
          t.id !== teamId &&
          t.name.toLowerCase() === name.toLowerCase()
        );
      
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Team name already exists."
        });
      }
      
      const oldLogoData =
        tournament.teamLogos?.[team.name];
      
      if (oldLogoData) {
        updates[`teamLogos/${name}`] = oldLogoData;
        updates[`teamLogos/${team.name}`] = null;
      }
    }
    
    updates[`teams/${teamId}`] = {
      ...team,
      name: name || team.name,
      logo: newLogo,
      updatedAt: Date.now()
    };
    
    await db.ref(`tournaments/${id}`).update(updates);
    
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

module.exports = router;