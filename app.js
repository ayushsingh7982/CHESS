const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
    console.log("Connected");

    // Assign player roles (white/black) when they connect
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
    }

    // Handle player disconnection
    uniquesocket.on("disconnect", function () {
        if (uniquesocket.id === players.black) {
            delete players.black;
        } else if (uniquesocket.id === players.white) {
            delete players.white;
        }
    });

    // Handle move event
    uniquesocket.on("move", (move) => {
        try {
            // Check if it's the player's turn
            if (chess.turn() === 'w' && uniquesocket.id !== players.white) return;
            if (chess.turn() === 'b' && uniquesocket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move); // Broadcast the move
                io.emit("boardState", chess.fen()); // Send updated board state
            } else {
                console.log("Invalid Move: ", move);
                uniquesocket.emit("InvalidMove", move);
            }
        } catch (err) {
            console.log(err);
            uniquesocket.emit("InvalidMove", move);
        }
    });

    // Handle chat message event
    uniquesocket.on("chatMessage", (message) => {
        const playerColor = players.white === uniquesocket.id ? "w" : "b";
        io.emit("chatMessage", message, playerColor); // Broadcast the chat message to all clients
    });
});

server.listen(3000, function () {
    console.log("Listening on port 3000");
});
