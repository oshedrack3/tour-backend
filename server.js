const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

let tournaments = [];

// Test route
app.get("/", (req, res) => {
  res.send("TourMaker Backend Running");
});

// Get all tournaments
app.get("/tournaments", (req, res) => {
  res.json(tournaments);
});

// Get single tournament
app.get("/tournaments/:id", (req, res) => {
  const id = req.params.id;
  const tournament = tournaments.find(t => t.id === id);
  
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found" });
  }
  
  res.json(tournament);
});

// Save tournament
app.post("/tournaments", (req, res) => {
  const data = req.body;
  
  if (!data || !data.id) {
    return res.status(400).json({ error: "Invalid tournament data" });
  }
  
  // Replace if already exists
  const index = tournaments.findIndex(t => t.id === data.id);
  
  if (index !== -1) {
    tournaments[index] = data;
  } else {
    tournaments.push(data);
  }
  
  res.json({
    success: true,
    message: "Tournament saved"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
