const express = require("express")
const http = require("http")
const socketIO = require("socket.io")
const cors = require("cors")
const upload = require("./config/multer")
const { encryptFile, decryptFile } = require("./utils/fileEncryption")

const CryptoJS = require("crypto-js")

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

// Generate a random room key
function generateRoomKey() {
  return CryptoJS.lib.WordArray.random(32).toString()
}

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id)

  // Create a new room
  socket.on("create_room", (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const roomKey = generateRoomKey() // Generate encryption key for the room
    
    rooms.set(roomId, { 
      users: new Set([socket.id]), 
      messages: [],
      encryptionKey: roomKey // Store the encryption key
    })
    
    socket.join(roomId)
    if (typeof callback === "function") {
      callback({ 
        success: true, 
        roomId,
        roomKey // Send the encryption key to the room creator
      })
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

    // Send previous messages and room key
    if (typeof callback === "function") {
      callback({
        success: true,
        messages: room.messages, // These messages are already encrypted
        roomKey: room.encryptionKey // Share the encryption key with the new user
      })
    }

    // Notify other users in the room
    socket.to(roomId).emit("user_joined", {
      message: `${username} has joined the room`,
      username,
      userId: socket.id
    })
  })

  // Generate unique message ID
  const generateMessageId = () => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  };

  // Handle sending new messages
  socket.on("send_message", ({ roomId, encryptedMessage, username, type = 'text' }) => {
    const room = rooms.get(roomId)
    if (!room) return

    const timestamp = new Date().toISOString();
    const messageData = {
      id: generateMessageId(),
      userId: socket.id,
      username,
      message: encryptedMessage, // Store encrypted message
      timestamp,
      type
    }

    room.messages.push(messageData)
    io.to(roomId).emit("new_message", messageData)
  })

  // Handle file messages
  socket.on("file_message", ({ roomId, fileData, username }) => {
    const room = rooms.get(roomId)
    if (!room) return

    const timestamp = new Date().toISOString();
    const messageData = {
      id: generateMessageId(),
      userId: socket.id,
      username,
      timestamp,
      type: 'file',
      fileData: {
        ...fileData,
        timestamp
      }
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

// File upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { roomId } = req.body;
    const room = rooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Encrypt file using room's encryption key
    const encryptedFile = encryptFile(req.file.buffer, room.encryptionKey);

    const fileData = {
      id: Date.now(),
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      encryptedData: encryptedFile,
      timestamp: new Date().toISOString()
    };

    // Store file metadata in room
    if (!room.files) room.files = new Map();
    room.files.set(fileData.id, fileData);

    // Emit file metadata to room
    io.to(roomId).emit("file_shared", {
      id: fileData.id,
      filename: fileData.filename,
      mimetype: fileData.mimetype,
      timestamp: fileData.timestamp
    });

    res.json({ success: true, fileId: fileData.id });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to process upload" });
  }
});

// File download endpoint
app.get("/files/:roomId/:fileId", (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    const room = rooms.get(roomId);

    if (!room || !room.files) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileData = room.files.get(parseInt(fileId));
    if (!fileData) {
      return res.status(404).json({ error: "File not found" });
    }

    // Decrypt file
    const decryptedBuffer = decryptFile(fileData.encryptedData, room.encryptionKey);

    res.set({
      'Content-Type': fileData.mimetype,
      'Content-Disposition': `attachment; filename=${fileData.filename}`
    });

    res.send(decryptedBuffer);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to process download" });
  }
});

// Simple API to check server status
app.get("/", (req, res) => res.send("Server is running!"))

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
