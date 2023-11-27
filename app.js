const express = require("express");

const bodyParser = require("body-parser");
// //let cors = require("cors");
const userRoutes = require("./routes/user");
const postRoutes = require("./routes/post");

const dotenv = require("dotenv");
dotenv.config();

const app = express();

// app.use(cors());

// mongoose
//   .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log("Connexion à MongoDB réussie !"))
//   .catch(() => console.log("Connexion à MongoDB échouée !"));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  //adds headers  while call  API
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization");

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  next();
});

// //Pour gérer la requête POST venant de l'application front-end, on a besoin d'en extraire le corps JSON.
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/api/auth", userRoutes);
app.use("/api/posts", postRoutes);

// app.use(express.static("./build/"));

// app.get("/*", (req, res) => {
//   res.sendFile("index.html", { root: "build/" });
// });
/*
app.use((req, res) => {
  res.json({ message: "Votre requête a bien été reçue !" });
});
*/
module.exports = app;
