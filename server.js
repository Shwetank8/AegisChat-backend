const express = require("express")
const http = require("http")
const socketIO = require("socket.io")
const cors = require("cors")
require("dotenv").config()

const app = express()
const server = http.createServer(app)
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true
}))
app.use(express.json())

// Store active rooms and participants
const rooms = new Map()

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id)

  // Create a new room
  socket.on("create_room", (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    rooms.set(roomId, { users: new Set([socket.id]), messages: [] })
    socket.join(roomId)
    if (typeof callback === "function") {
      callback({ success: true, roomId })
    }
  })

  // Join an existing room
  socket.on("join_room", ({ roomId, username }, callback) => {
    const room = rooms.get(roomId)
    if (!room) {
      if (typeof callback === "function") callback({ success: false, error: "Room not found" })
      return
    }

    socket.join(roomId)
    room.users.add(socket.id)

    // Send previous messages
    if (typeof callback === "function") {
      callback({
        success: true,
        messages: room.messages
      })
    }

    // Notify other users in the room
    socket.to(roomId).emit("user_joined", {
      message: `${username} has joined the room`,
      username,
      userId: socket.id
    })
  })

  // Handle sending new messages
  socket.on("send_message", ({ roomId, message, username }) => {
    const room = rooms.get(roomId)
    if (!room) return

    const messageData = {
      id: Date.now(),
      userId: socket.id,
      username,
      message,
      timestamp: new Date().toISOString()
    }

    room.messages.push(messageData)
    io.to(roomId).emit("new_message", messageData)
  })

  // Handle disconnects
  socket.on("disconnect", () => {
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id)

        // Remove room if empty
        if (room.users.size === 0) {
          rooms.delete(roomId)
        } else {
          io.to(roomId).emit("user_left", {
            message: "A user has left the room",
            username: "Someone",
            userId: socket.id
          })
        }
      }
    })
    console.log("A user disconnected:", socket.id)
  })
})

// Simple API to check server status
app.get("/", (req, res) => res.send("Server is running!"))

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
