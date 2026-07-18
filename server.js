const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

app.use(cors());

// Handle normal JSON requests (small data only)
app.use(express.json());

// Handle file uploads
const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
});

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
    return res.status(404).json({
      error: "Tournament not found"
    });
  }
  
  res.json(tournament);
});


// Receive tournament as a file
app.post("/tournaments/upload", upload.single("tournament"), (req, res) => {
  
  console.log("Tournament file received");
  
  if (!req.file) {
    return res.status(400).json({
      error: "No tournament file uploaded"
    });
  }
  
  try {
    
    // Convert file buffer to JSON
    const data = JSON.parse(req.file.buffer.toString());
    
    const index = tournaments.findIndex(t => t.id === data.id);
    
    if (index !== -1) {
      tournaments[index] = data;
    } else {
      tournaments.push(data);
    }
    
    console.log("Saved tournament:", data.id);
    
    res.json({
      success: true,
      message: "Tournament uploaded successfully"
    });
    
  } catch (error) {
    
    res.status(400).json({
      error: "Invalid tournament file"
    });
    
  }
  
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});