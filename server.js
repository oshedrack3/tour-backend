const express = require("express");
const cors = require("cors");

const db = require("./firebase");
const authRoutes = require("./auth");
const authenticate = require("./middleware");
const tournamentRoutes = require("./tournaments");
const userManagementRoutes = require("./userManagement");
const competitionRoutes = require("./competitionRoutes");
const notificationRoutes = require("./notificationRoutes");

const {
  addClient,
  removeClient
} = require("./events");


const app = express();
async function initializeHallOfFame() {
  const snapshot = await db
    .ref("hallOfFame")
    .once("value");

  if (snapshot.exists()) {
    return;
  }

  await db.ref("hallOfFame").set({
    categories: [
      {
        id: "league-winners",
        title: "League Winners",
        icon: "🥇",
        winners: [
          { name: "Adetiger", wins: 2 },
          { name: "Sancho", wins: 6 },
          { name: "Emmy", wins: 1 },
          { name: "PEiN", wins: 1 }
        ]
      },
      {
        id: "champions-league-winners",
        title: "Champions League Winners",
        icon: "🏆",
        winners: [
          { name: "Slime", wins: 2 },
          { name: "Kenny", wins: 1 },
          { name: "Emmy", wins: 1 },
          { name: "PEiN", wins: 1 },
          { name: "All4Wincy", wins: 1 },
          { name: "Sancho", wins: 1 }
        ]
      },
      {
        id: "europa-league-winners",
        title: "Europa League Winners",
        icon: "🏆",
        winners: [
          { name: "Puzzle", wins: 1 },
          { name: "Evidonia", wins: 1 },
          { name: "George", wins: 1 },
          { name: "Muh’d", wins: 1 }
        ]
      },
      {
        id: "super-cup-winners",
        title: "Super Cup Winners",
        icon: "🏆",
        winners: [
          { name: "Slime", wins: 1 },
          { name: "Evidonia", wins: 1 },
          { name: "Emmy", wins: 1 },
          { name: "George", wins: 1 }
        ]
      },
      {
        id: "league-cup-winners",
        title: "League Cup Winners",
        icon: "🏆",
        winners: [
          { name: "ChristoCentric", wins: 1 },
          { name: "Emmy", wins: 1 }
        ]
      },
      {
        id: "communi-shield-winners",
        title: "Communi Shield Winners",
        icon: "🏆",
        winners: [
          { name: "PEiN", wins: 1 }
        ]
      },
      {
        id: "player-of-the-season",
        title: "Player Of The Season",
        icon: "🏆",
        winners: [
          { name: "PEiN", wins: 1 }
        ]
      }
    ]
  });
}

initializeHallOfFame().catch(console.error);

app.use(cors());
app.use(express.json({
  limit: "25mb"
}));


app.use("/auth", authRoutes);
app.use("/tournaments", tournamentRoutes);
app.use("/users", userManagementRoutes);
app.use("/competitions", competitionRoutes);
app.use("/notifications", notificationRoutes);
app.get("/", (req, res) => {
  res.send("Backend Running");
});
app.get("/events/:tournamentId", authenticate, (req, res) => {
  
  const tournamentId = req.params.tournamentId;
  
  
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
    `data: ${JSON.stringify({
      connected:true
    })}\n\n`
  );
  
  
  req.on("close", () => {
    
    removeClient(
      tournamentId,
      res
    );
    
  });
  
});

app.post("/db/write", async (req, res) => {
  try {
    const { path, data } = req.body;
    
    await db.ref(path).set(data);
    
    res.json({
      success: true
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.get("/db/read", async (req, res) => {
  try {
    const snapshot = await db.ref(req.query.path).once("value");
    
    res.json({
      success: true,
      data: snapshot.val()
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.patch("/db/update", async (req, res) => {
  try {
    const { path, data } = req.body;
    
    await db.ref(path).update(data);
    
    res.json({
      success: true
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.delete("/db/delete", async (req, res) => {
  try {
    const { path } = req.body;
    
    await db.ref(path).remove();
    
    res.json({
      success: true
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



// end