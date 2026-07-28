const express = require("express");
const cors = require("cors");

const db = require("./firebase");
const authRoutes = require("./auth");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend Running");
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