const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let waitingPlayer = null;
let rooms = {};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // Tìm trận
  socket.on("findMatch", () => {
    if (waitingPlayer && waitingPlayer !== socket) {

      const roomId = "room_" + socket.id + "_" + waitingPlayer.id;

      socket.join(roomId);
      waitingPlayer.join(roomId);

      rooms[roomId] = {
        player1: { id: waitingPlayer.id, hp: 100 },
        player2: { id: socket.id, hp: 100 }
      };

      io.to(roomId).emit("matchFound", {
        roomId,
        players: rooms[roomId]
      });

      waitingPlayer = null;

    } else {
      waitingPlayer = socket;
      socket.emit("waiting");
    }
  });

  // Attack
  socket.on("attack", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const damage = Math.floor(Math.random() * 15) + 5;

    if (room.player1.id === socket.id) {
      room.player2.hp -= damage;
    } else {
      room.player1.hp -= damage;
    }

    io.to(roomId).emit("updateHP", room);

    if (room.player1.hp <= 0 || room.player2.hp <= 0) {
      io.to(roomId).emit("gameOver", room);
      delete rooms[roomId];
    }
  });

  socket.on("disconnect", () => {
    if (waitingPlayer === socket) {
      waitingPlayer = null;
    }
    console.log("Disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Server is running!");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});