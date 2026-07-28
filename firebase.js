const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = JSON.parse(
  fs.readFileSync(
    process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json",
    "utf8"
  )
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://champions-58b37-default-rtdb.europe-west1.firebasedatabase.app"
});

module.exports = admin.database();

// end