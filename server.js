const express = require("express")
const http = require("http")
const socketIO = require("socket.io")
const cors = require("cors")
const upload = require("./config/multer")
const { encryptFile, decryptFile } = require("./utils/fileEncryption")
const redisService = require("./services/redisService")
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

// Generate a random room key
function generateRoomKey() {
  return CryptoJS.lib.WordArray.random(32).toString()
}

// Generate unique message ID
const generateMessageId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id)

  // Create a new room
  socket.on("create_room", async (callback) => {
    try {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
      const roomKey = generateRoomKey()
      
      await redisService.createRoom(roomId, { encryptionKey: roomKey })
      await redisService.addUserToRoom(roomId, socket.id, "Room Creator")
      
      socket.join(roomId)
      if (typeof callback === "function") {
        callback({ 
          success: true, 
          roomId,
          roomKey
        })
      }
    } catch (error) {
      console.error("Error creating room:", error)
      if (typeof callback === "function") {
        callback({ success: false, error: "Failed to create room" })
      }
    }
  })

  // Join an existing room
  socket.on("join_room", async ({ roomId, username }, callback) => {
    try {
      const roomData = await redisService.getRoomData(roomId)
      if (!roomData || !roomData.encryptionKey) {
        if (typeof callback === "function") callback({ success: false, error: "Room not found" })
        return
      }

      await redisService.addUserToRoom(roomId, socket.id, username)
      socket.join(roomId)

      // Get messages and active users
      const [messages, users] = await Promise.all([
        redisService.getMessages(roomId),
        redisService.getRoomUsers(roomId)
      ])

      // Update room activity
      await redisService.updateRoomActivity(roomId)

      if (typeof callback === "function") {
        callback({
          success: true,
          messages,
          roomKey: roomData.encryptionKey,
          users
        })
      }

      // Notify other users
      socket.to(roomId).emit("user_joined", {
        message: `${username} has joined the room`,
        username,
        userId: socket.id
      })
    } catch (error) {
      console.error("Error joining room:", error)
      if (typeof callback === "function") {
        callback({ success: false, error: "Failed to join room" })
      }
    }
  })

  // Handle sending new messages
  socket.on("send_message", async ({ roomId, encryptedMessage, username, type = 'text' }) => {
    try {
      const roomData = await redisService.getRoomData(roomId)
      if (!roomData) return

      const messageData = {
        id: generateMessageId(),
        userId: socket.id,
        username,
        message: encryptedMessage,
        timestamp: new Date().toISOString(),
        type
      }

      await redisService.addMessage(roomId, messageData)
      await redisService.updateRoomActivity(roomId)

      io.to(roomId).emit("new_message", messageData)
    } catch (error) {
      console.error("Error sending message:", error)
    }
  })

  // Handle file messages
  socket.on("file_message", async ({ roomId, fileData, username }) => {
    try {
      const roomData = await redisService.getRoomData(roomId)
      if (!roomData) return

      const timestamp = new Date().toISOString()
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

      await redisService.addMessage(roomId, messageData)
      await redisService.updateRoomActivity(roomId)

      io.to(roomId).emit("new_message", messageData)
    } catch (error) {
      console.error("Error handling file message:", error)
    }
  })

  // Handle disconnects
  socket.on("disconnect", async () => {
    try {
      // Find all rooms this socket is in
      const rooms = [...socket.rooms]
      for (const roomId of rooms) {
        const users = await redisService.getRoomUsers(roomId)
        if (users.find(user => user.id === socket.id)) {
          await redisService.removeUserFromRoom(roomId, socket.id)
          
          const remainingUsers = await redisService.getRoomUsers(roomId)
          if (Object.keys(remainingUsers).length === 0) {
            // Room is empty, it will be automatically cleaned up by Redis TTL
          } else {
            io.to(roomId).emit("user_left", {
              message: "A user has left the room",
              username: "Someone",
              userId: socket.id
            })
          }
        }
      }
      console.log("A user disconnected:", socket.id)
    } catch (error) {
      console.error("Error handling disconnect:", error)
    }
  })
})

// File upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { roomId } = req.body;
    const roomData = await redisService.getRoomData(roomId);

    if (!roomData) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Encrypt file using room's encryption key
    const encryptedFile = encryptFile(req.file.buffer, roomData.encryptionKey);

    const fileData = {
      id: Date.now(),
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      encryptedData: encryptedFile,
      timestamp: new Date().toISOString()
    };

    // Store file in Redis
    await redisService.addFile(roomId, fileData.id, fileData);
    await redisService.updateRoomActivity(roomId);

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
app.get("/files/:roomId/:fileId", async (req, res) => {
  try {
    const { roomId, fileId } = req.params;
    const roomData = await redisService.getRoomData(roomId);

    if (!roomData) {
      return res.status(404).json({ error: "Room not found" });
    }

    const fileData = await redisService.getFile(roomId, fileId);
    if (!fileData) {
      return res.status(404).json({ error: "File not found" });
    }

    // Decrypt file
    const decryptedBuffer = decryptFile(fileData.encryptedData, roomData.encryptionKey);

    res.setHeader('Content-Type', fileData.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);

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
