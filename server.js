const express = require("express");
const cors = require("cors");

const db = require("./firebase");
const authRoutes = require("./auth");
const authenticate = require("./middleware");
const tournamentRoutes = require("./tournaments");


const app = express();

const clients = new Map();

setInterval(() => {
  for (const res of clients.values()) {
    res.write(": ping\n\n");
  }
}, 25000);

app.use(cors());
app.use(express.json({
  limit: "25mb"
}));


app.use("/auth", authRoutes);
app.use("/tournaments", tournamentRoutes);

app.get("/", (req, res) => {
  res.send("Backend Running");
});
app.get("/events", authenticate, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  res.flushHeaders();
  
  const uid = req.user.uid;
  
  clients.set(uid, res);
  
  res.write(`event: connected\n`);
  res.write(
    `data: ${JSON.stringify({
      success: true,
      uid
    })}\n\n`
  );
  
  req.on("close", () => {
    clients.delete(uid);
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

module.exports = {
  clients
};

// end