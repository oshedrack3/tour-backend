const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});


let tournaments = [];
let logos = {};


app.get("/", (req, res) => {
  res.send("TourMaker Backend Running");
});


app.get("/tournaments", (req, res) => {
  res.json(tournaments);
});


app.get("/tournaments/:id", (req, res) => {
  
  const tournament = tournaments.find(
    t => String(t.id) === String(req.params.id)
  );
  
  if (!tournament) {
    return res.status(404).json({
      error: "Tournament not found"
    });
  }
  
  
  res.json({
    id: tournament.id,
    version: tournament.version,
    tournament: tournament.tournament,
    logos: logos[tournament.id] || {}
  });
  
});



app.post(
  "/tournaments/upload",
  upload.any(),
  (req, res) => {
    
    try {
      
      const tournamentFile = req.files.find(
        f => f.fieldname === "tournament"
      );
      
      
      if (!tournamentFile) {
        return res.status(400).json({
          error: "No tournament file uploaded"
        });
      }
      
      
      const data = JSON.parse(
        tournamentFile.buffer.toString()
      );
      
      
      const existingIndex = tournaments.findIndex(
        t => String(t.id) === String(data.id)
      );
      
      
      if (existingIndex !== -1) {
        
        tournaments[existingIndex] = data;
        
      } else {
        
        tournaments.push(data);
        
      }
      
      
      
      if (!logos[data.id]) {
        logos[data.id] = {};
      }
      
      
      
      req.files
        .filter(f => f.fieldname.startsWith("logo_"))
        .forEach(file => {
          
          const logoName = file.originalname;
          
          logos[data.id][logoName] =
            `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
          
        });
      
      
      
      console.log(
        "Saved tournament:",
        data.id
      );
      
      
      res.json({
        success: true,
        mode: existingIndex !== -1 ? "update" : "create",
        id: data.id
      });
      
      
    } catch (error) {
      
      console.error(error);
      
      res.status(400).json({
        error: "Invalid upload"
      });
      
    }
    
  }
);



const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    "Server currently running on port " + PORT
  );
});


