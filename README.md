## AegisChat-backend  
AegisChat-backend is the server-side component powering the AegisChat application. It handles user authentication, message exchange, real-time communication (via websockets or similar), and database persistence. This backend provides the core API and socket logic to support the frontend chat interface, enabling efficient, scalable, and secure chat operations.

---

## 📸 Preview
<img width="1739" height="829" alt="image" src="https://github.com/user-attachments/assets/e8e5df23-df75-46fb-bf6b-638bb7a403ae" />



<img width="1498" height="814" alt="image" src="https://github.com/user-attachments/assets/a446d1ff-30eb-4a7a-8665-fdf53120f1bd" />

---

## Key Features  
- 💬 Real-time chat powered by Socket.IO
- 🔐 End-to-end encryption (E2EE) using AES via crypto-js
- ⚡ Smooth, responsive UI for mobile & desktop
- 🧠 Persistent room sessions using redis
- 📋 Copyable Room ID
- 🎨 Elegant UI with Tailwind and Lucide icons
- 🔄 Automatic scroll to latest message

---

## 🚀 Tech Stack

- **NodeJs**
- **Redis and Redis cloud**
- **CryptoJS**
- **Socket.IO Client**

---

## AES 
AES (Advanced Encryption Standard) is a symmetric encryption algorithm used worldwide to protect sensitive data. AES works by converting plaintext (readable data) into ciphertext (encrypted data) using a secret key, and the same key is required to decrypt it back to plaintext.

# 🔒 Key Features:
- **Symmetric encryption**: the same key is used for both encryption and decryption.
- **Fast and secure**: optimized for performance while maintaining strong protection.
- **Resistant to attacks**: AES is considered cryptographically secure when implemented correctly.

In **AegisChat**, AES is used to provide end-to-end encryption (E2EE) via CryptoJS, ensuring that only the sender and intended recipient can read message contents — not even the server can decrypt them.

---

## Installation & Setup  
1. Clone the repository:  
   ```bash  
   git clone https://github.com/Shwetank8/AegisChat-backend.git  
   cd AegisChat-backend
   
2. Required environment variables:
- `PORT`: Server port (default: 5000)
- `CORS_ORIGIN`: Frontend URL (default: http://localhost:3000)
- `REDIS_URL`: Redis connection URL (for Redis Cloud)
  - OR use individual settings:
  - `REDIS_USERNAME`: Redis username
  - `REDIS_HOST`: Redis host
  - `REDIS_PORT`: Redis port
  - `REDIS_PASSWORD`: Redis password
  - 
3. Redis Setup
- Create a free Redis Cloud account at https://redis.com/try-free/
- Create a new database
- Copy the connection details to your .env file

4. Install Dependencies and run
```bash
npm install
nodemon server.js
 


