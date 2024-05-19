// const express = require("express");
// const app = express();
// const http = require("http");
// const server = http.createServer(app);
// const { Server } = require("socket.io");
// const io = new Server(server);
// var mysql = require("mysql");
// const bodyParser = require("body-parser");
// var path = require("path");
// var multer = require("multer");
// var crypto = require("crypto");

// var storage = multer.diskStorage({
//   destination: "./public/profPics/",
//   filename: function (req, file, cb) {
//     crypto.pseudoRandomBytes(16, function (err, raw) {
//       if (err) return cb(err);

//       cb(null, raw.toString("hex") + path.extname(file.originalname));
//     });
//   },
// });

// var upload = multer({ storage: storage });

// const conn = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "root",
//   database: "slutprojekt_prog2",
// });

// conn.connect((err) => {
//   if (err) {
//     console.error("Error connecting to MySQL database: " + err.stack);
//     return;
//   }
//   console.log("Connected to MySQL database");
// });

// app.use(express.json());
// app.use("/public", express.static("public"));
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

// // function processUserInput(inputArray) {
// //   for (let input of inputArray) {
// //     if (!/^[a-zA-Z0-9.@]+#$/.test(input)) {
// //       return false;
// //     }
// //   }
// //   return true;
// // }

// app.get("/", (req, res) => {
//   res.sendFile(__dirname + "/index.html");
// });

// const users = {};

// // var thisUserId = "";
// // app.post("/addUser", upload.single("profilePic"), (req, res) => {
// //   const username = req.body.username;
// //   const passwd = req.body.passwd;
// //   const circolor = req.body.circolor;
// //   const profilePic = req.file.filename;
// //   const insertQuery = `INSERT INTO users (username, passwd, favcolor, profilepic) VALUES (?, ?, ?, ?)`;
// //   const values = [username, passwd, circolor, profilePic];
// //   console.log(values);
// //   // const isValid = processUserInput(values);

// //   // if (!isValid) {
// //   //   console.error("Error inserting data into the database: Invalid input. ");
// //   //   res.sendStatus(422);
// //   //   return;
// //   // }

// //   conn.query(insertQuery, values, (err, result) => {
// //     if (err) {
// //       console.error("Error inserting data into the database: " + err.stack);
// //       res.sendStatus(500);
// //       return;
// //     }

// //     console.log("Inserted into database with ID: " + result.insertId);
// //     res.redirect("/");
// //     thisUserId = result.insertId;
// //   });
// // });

// // app.get("/updateUserInfo", (req, res) => {
// //   const searchId = thisUserId;
// //   const UNQuery = `SELECT username, profilepic FROM users WHERE id = ?`;
// //   conn.query(UNQuery, searchId, (err, results) => {
// //     if (err) {
// //       console.error("Error retrieving data from the database: " + err.stack);
// //       res.sendStatus(500);
// //       return;
// //     }
// //     res.json(results);
// //   });
// // });

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

// Define the getRandomInt function
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
  // const canvasWidth = 600;
  // const canvasHeight = 600;
  if (!foodGenerationStarted) {
    foodGenerationInterval = setInterval(() => {
      generateFood(canvasWidth, canvasHeight, 1);
    }, 5000);
    foodGenerationStarted = true;
  }
}

// Function to stop food generation
function stopFoodGeneration() {
  clearInterval(foodGenerationInterval);
  foodGenerationStarted = false;
}

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("newUser", (userData) => {
    const { canvasWidth, canvasHeight } = userData;

    // Generate initial food positions only if foods array is empty
    // if (foods.length !== 0) {

    // }
    // else if (foods.length === 0) {
    // if (foods.length === 0) {
    // for (let j = 0; j < 10; j++) {
    generateFood(canvasWidth, canvasHeight, 10);
    startFoodGeneration(canvasWidth, canvasHeight);
    // }
    // }
    // }

    // Add the new user to the users object
    users[socket.id] = { id: socket.id, ...userData, circleRadius: 20 };

    // Emit the current users and initial food positions to the new user
    socket.emit("newUserAndFoods", { users, foods });

    // Emit the new user to all connected clients
    io.emit("updateUsers", { users, foods });
    // console.log(foods);
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
      console.log(playerId);
      users[playerId].radius += eatenFood.radius / 5;
      // console.log(users.findIndex(id, playerId));
      io.emit("updateFoods", {
        foods,
        playerId,
        eatenFoodVal: eatenFood.radius,
      });
    }
  });

  socket.on("disconnect", () => {
    // Remove the disconnected user
    delete users[socket.id];
    if (Object.keys(users).length === 0) {
      foods.length = 0;
      stopFoodGeneration();
    }
    // console.log(users);
    // if (users.length > 0) {
    //   for (i = 0; i < 10; i++) {
    //     foods.pop(i);
    //   }
    // } else {
    //   for (l = foods.length; l > -1; ) {
    //     foods.pop(l);
    //     l -= 1;
    //   }
    // }

    // if ((users.length = 0)) {
    // foods.length = 0;
    // }

    // Broadcast the updated user list to all clients
    io.emit("updateUsers", { users, foods });
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
