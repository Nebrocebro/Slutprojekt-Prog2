const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
var mysql = require("mysql");

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const users = {};

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
