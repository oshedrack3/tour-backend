const express = require("express");
const bcrypt = require("bcrypt");

const db = require("./firebase");
const authenticate = require("./middleware");
const {
  deleteCloudinaryImage
} = require("./cloudinary");

const router = express.Router();

router.delete("/delete-my-account", authenticate, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required."
      });
    }
    
    const snapshot = await db.ref(`users/${uid}`).once("value");
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }
    
    const user = snapshot.val();
    
    const validPassword = await bcrypt.compare(
      password,
      user.password
    );
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password."
      });
    }
    
    await deleteUserData(uid);
    
    res.json({
      success: true,
      message: "Account deleted successfully."
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


async function deleteUserData(uid) {
  const tournamentsSnap = await db
    .ref("tournaments")
    .once("value");
  
  const tournaments = tournamentsSnap.val() || {};
  
  for (const [id, tournament] of Object.entries(tournaments)) {
    
    if (tournament.adminUid === uid) {
      
      if (tournament.tournamentImage?.publicId) {
        await deleteCloudinaryImage(
          tournament.tournamentImage.publicId
        );
      }
      
      for (const logo of Object.values(
          tournament.teamLogos || {}
        )) {
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
      
      await db
        .ref(`tournaments/${id}`)
        .remove();
      
      continue;
    }
    
    
    const updates = {};
    
    
    if (tournament.players?.[uid]) {
      updates[`players/${uid}`] = null;
    }
    
    
    for (const [teamId, team] of Object.entries(
        tournament.teams || {}
      )) {
      
      if (team.ownerUid === uid) {
        
        if (team.logo?.publicId) {
          await deleteCloudinaryImage(
            team.logo.publicId
          );
        }
        
        updates[`teams/${teamId}`] = null;
        updates[`teamLogos/${teamId}`] = null;
      }
    }
    
    
    if (Object.keys(updates).length) {
      await db
        .ref(`tournaments/${id}`)
        .update(updates);
    }
  }
  
  
  const sessionsSnap = await db
    .ref("sessions")
    .once("value");
  
  const sessions = sessionsSnap.val() || {};
  
  
  for (const [token, session] of Object.entries(sessions)) {
    
    if (session.uid === uid) {
      await db
        .ref(`sessions/${token}`)
        .remove();
    }
    
  }
  
  
  await db
    .ref(`users/${uid}`)
    .remove();
}

router.delete("/manager-delete-user/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { accessCode } = req.body;
    
    if (!accessCode) {
      return res.status(400).json({
        success: false,
        message: "Access code is required."
      });
    }
    
    if (accessCode !== process.env.MANAGER_DELETE_CODE) {
      return res.status(403).json({
        success: false,
        message: "Invalid access code."
      });
    }
    
    const snapshot = await db
      .ref(`users/${uid}`)
      .once("value");
    
    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }
    
    await deleteUserData(uid);
    
    res.json({
      success: true,
      message: "User deleted successfully."
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;
