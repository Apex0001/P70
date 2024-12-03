const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("find_partner", ({ username, gender }) => {
    socket.username = username;
    socket.gender = gender;

    if (waitingUser) {
      // Pair the users
      socket.partner = waitingUser;
      waitingUser.partner = socket;

      // Notify both users
      waitingUser.emit("connected", {
        username: socket.username,
        gender: socket.gender,
      });
      socket.emit("connected", {
        username: waitingUser.username,
        gender: waitingUser.gender,
      });

      waitingUser.emit("message", { msg: `You are now connected to ${socket.username}.`, isSent: false });
      socket.emit("message", { msg: `You are now connected to ${waitingUser.username}.`, isSent: false });

      waitingUser = null;
    } else {
      // Wait for a partner
      waitingUser = socket;
      socket.emit("message", { msg: "Waiting for a random user to join...", isSent: false });
    }
  });

  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.emit("message", { msg, isSent: true }); // Sent message
      socket.partner.emit("message", { msg, isSent: false }); // Received message
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    if (socket.partner) {
      socket.partner.emit("message", { msg: "The other user has disconnected.", isSent: false });
      socket.partner.partner = null;
    }
    if (waitingUser === socket) {
      waitingUser = null;
    }
  });
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
