const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("./firebase");
const authenticate = require("./middleware");



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

    const { name, format } = req.body;

    if (!name || !format) {
      return res.status(400).json({
        success: false,
        message: "Name and format are required."
      });
    }

    const id = uuid();

    const tournament = {
      id,
      name,
      format,
      adminUid: user.uid,
      teams: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
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


module.exports = router;
