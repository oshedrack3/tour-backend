const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

app.use(express.json({ limit: "50mb" }));

let tournaments = [];

app.get("/", (req, res) => {
  res.send("TourMaker Backend Running");
});

app.get("/tournaments", (req, res) => {
  res.json(tournaments);
});

app.get("/tournaments/:id", (req, res) => {
  const tournament = tournaments.find(t => t.id === req.params.id);
  
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found" });
  }
  
  res.json(tournament);
});

app.post("/tournaments", (req, res) => {
  console.log("POST /tournaments received");
  
  const data = req.body;
  
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

