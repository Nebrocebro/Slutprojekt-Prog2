const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
var mysql = require("mysql");
const bodyParser = require("body-parser");
var path = require("path");
var multer = require("multer");
var crypto = require("crypto");
const { emit } = require("process");

var storage = multer.diskStorage({
  destination: "./public/profPics/",
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      if (err) return cb(err);
      cb(null, raw.toString("hex") + path.extname(file.originalname));
    });
  },
});

var upload = multer({ storage: storage });

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "slutprojekt_prog2",
});

conn.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database: " + err.stack);
    return;
  }
  console.log("Connected to MySQL database");
});

app.use(express.json());
app.use("/public", express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const users = {};
let foods = [];
let foodGenerationInterval;
let foodGenerationStarted = false;

let thisUserId = "";
app.post("/addUser", upload.single("profilePic"), (req, res) => {
  const username = req.body.username;
  const passwd = req.body.passwd;
  const circolor = req.body.circolor;
  const profilePic = req.file.filename;
  if (!req.file) {
    res.status(400).send("No file uploaded.");
    profilePic = "";
  }
  const insertQuery = `INSERT INTO users (username, passwd, favcolor, profilepic) VALUES (?, ?, ?, ?)`;
  const values = [username, passwd, circolor, profilePic];
  console.log(values);

  conn.query(insertQuery, values, (err, result) => {
    if (err) {
      console.error("Error inserting data into the database: " + err.stack);
      res.sendStatus(500);
      return;
    }

    console.log("Inserted into database with ID: " + result.insertId);
    res.redirect("/");
    thisUserId = result.insertId;
  });
});

let usernameVal = "";
let profilePicVal = "";
let colorVal = "";
let hiScoreVal = "0";
app.get("/updateUserInfo", (req, res) => {
  const searchId = thisUserId;
  const UNQuery = `SELECT username, hiscore, profilepic, favcolor FROM users WHERE id = ?`;
  conn.query(UNQuery, searchId, (err, results) => {
    if (err) {
      console.error("Error retrieving data from the database: " + err.stack);
      res.sendStatus(500);
      return;
    }
    // if (results.profilepic == "" || null) {
    // data = {
    //   usernameVal: results[0].username,
    //   hiscoreVal: results[0].hiscore,
    //   profilePicVal: "",
    //   colorVal: results[0].favcolor,
    // };
    // } else {
    data = {
      usernameVal: results[0].username,
      hiscoreVal: results[0].hiscore,
      profilePicVal: results[0].profilepic,
      colorVal: results[0].favcolor,
    };
    // }
    console.log("hejhej va ", data);
    res.json(data);
  });
});

function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

function generateFood(canvasWidth, canvasHeight, amount) {
  for (let i = 0; i < amount; i++) {
    foods.push({
      x: getRandomInt(20, canvasWidth - 20),
      y: getRandomInt(20, canvasHeight - 20),
      radius: getRandomInt(5, 10),
      color: "green",
    });
  }
  io.emit("updateFoods", { foods });
}

function startFoodGeneration(canvasWidth, canvasHeight) {
  if (!foodGenerationStarted) {
    foodGenerationInterval = setInterval(() => {
      generateFood(canvasWidth, canvasHeight, 1);
    }, 5000);
    foodGenerationStarted = true;
  }
}

function stopFoodGeneration() {
  clearInterval(foodGenerationInterval);
  foodGenerationStarted = false;
}

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("newUser", (userData) => {
    const { canvasWidth, canvasHeight } = userData;

    generateFood(canvasWidth, canvasHeight, 10);
    startFoodGeneration(canvasWidth, canvasHeight);

    users[socket.id] = { id: socket.id, ...userData, circleRadius: 20 };

    socket.emit("newUserAndFoods", { users, foods });

    io.emit("updateUsers", { users, foods });
  });

  socket.on("updatePosition", (data) => {
    if (users[socket.id]) {
      users[socket.id] = {
        id: socket.id,
        ...users[socket.id],
        ...data,
      };
      io.emit("updatePosition", { id: socket.id, ...data });
    }
  });

  socket.on("foodEaten", ({ foodIndex, playerId }) => {
    if (foods[foodIndex]) {
      const eatenFood = foods[foodIndex];
      foods.splice(foodIndex, 1);
      users[playerId].circleRadius += eatenFood.radius / 5;
      const newRadius = users[playerId].circleRadius;
      io.emit("updateFoods", {
        foods,
        playerId,
        newRadius,
      });
    }
  });

  socket.on("saveHighScore", ({ disconnUsername, score }) => {
    const userId = disconnUsername;
    const searchQuery = `SELECT hiscore FROM users WHERE username = ?`;
    conn.query(searchQuery, [userId], (err, results) => {
      if (err) {
        console.error(
          "Error retrieving high score from the database: " + err.stack
        );
        return;
      }
      if (results.length === 0) {
        console.error("No user found with ID: " + userId);
        return;
      }
      const currentHighScore = results[0].hiscore;
      if (score > currentHighScore) {
        const updateQuery = `UPDATE users SET hiscore = ? WHERE username = ?`;
        conn.query(updateQuery, [score, userId], (err, results) => {
          if (err) {
            console.error(
              "Error updating high score in the database: " + err.stack
            );
          } else {
            console.log("High score updated successfully for user: " + userId);
          }
        });
      }
    });
  });

  socket.on("disconnect", () => {
    // io.emit("disconnect", users[socket.id]);
    delete users[socket.id];
    if (Object.keys(users).length === 0) {
      foods.length = 0;
      stopFoodGeneration();
    }
    io.emit("updateUsers", { users, foods });
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
