const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let tournaments = [];

app.get("/", (req, res) => {
  res.send("TourMaker Backend Running");
});


app.get("/tournaments", (req, res) => {
  res.json(tournaments);
});


app.post("/tournaments", (req, res) => {
  
  const data = req.body;
  
  tournaments.push(data);
  
  res.json({
    success: true,
    message: "Tournament saved"
  });
  
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
