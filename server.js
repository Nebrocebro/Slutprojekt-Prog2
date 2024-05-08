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

// function processUserInput(inputArray) {
//   for (let input of inputArray) {
//     if (!/^[a-zA-Z0-9.@]+#$/.test(input)) {
//       return false;
//     }
//   }
//   return true;
// }

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const users = {};

// var thisUserId = "";
// app.post("/addUser", upload.single("profilePic"), (req, res) => {
//   const username = req.body.username;
//   const passwd = req.body.passwd;
//   const circolor = req.body.circolor;
//   const profilePic = req.file.filename;
//   const insertQuery = `INSERT INTO users (username, passwd, favcolor, profilepic) VALUES (?, ?, ?, ?)`;
//   const values = [username, passwd, circolor, profilePic];
//   console.log(values);
//   // const isValid = processUserInput(values);

//   // if (!isValid) {
//   //   console.error("Error inserting data into the database: Invalid input. ");
//   //   res.sendStatus(422);
//   //   return;
//   // }

//   conn.query(insertQuery, values, (err, result) => {
//     if (err) {
//       console.error("Error inserting data into the database: " + err.stack);
//       res.sendStatus(500);
//       return;
//     }

//     console.log("Inserted into database with ID: " + result.insertId);
//     res.redirect("/");
//     thisUserId = result.insertId;
//   });
// });

// app.get("/updateUserInfo", (req, res) => {
//   const searchId = thisUserId;
//   const UNQuery = `SELECT username, profilepic FROM users WHERE id = ?`;
//   conn.query(UNQuery, searchId, (err, results) => {
//     if (err) {
//       console.error("Error retrieving data from the database: " + err.stack);
//       res.sendStatus(500);
//       return;
//     }
//     res.json(results);
//   });
// });


io.on("connection", (socket) => {
  console.log("a user connected");

  // Listen for newUser event
  socket.on("newUser", (userData) => {
    // Emit the current users to the new user
    socket.emit("updateUsers", users);

    // Add the new user to the users object
    users[socket.id] = { id: socket.id, ...userData };
    // Emit the new user to all connected clients
    io.emit("updateUsers", users);
  });

  socket.on("updatePosition", (data) => {
    // Update the position of the user
    users[socket.id] = {
      id: socket.id,
      ...users[socket.id],
      ...data,
      username: users[socket.id].username,
    };
    // Broadcast the updated user position to all clients
    io.emit("updatePosition", { id: socket.id, ...data });
  });

  socket.on("disconnect", () => {
    // Remove the disconnected user
    delete users[socket.id];
    // Broadcast the updated user list to all clients
    io.emit("updateUsers", users);
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
