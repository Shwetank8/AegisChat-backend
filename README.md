# 🔐 AegisChat — backend

A secure real-time chat server built using **Node.js**, **Express**, and **Socket.IO** featuring **end-to-end encryption (E2EE)** powered by **crypto-js**.
This backend manages encrypted communication, room creation, and real-time messaging between connected clients.

---

## 🚀 Tech Stack

- **Next.js 14 (App Router)**
- **CryptoJS**
- **React 18**
- **Socket.IO Client**
- **Tailwind CSS**
- **TypeScript**
- **Lucide Icons**
- **Framer Motion (for subtle animations)**

---

## Features

- 💬 Real-time chat powered by Socket.IO
- 🔐 End-to-end encryption (E2EE) using AES via crypto-js
- ⚡ Smooth, responsive UI for mobile & desktop
- 🧠 Persistent room sessions
- 📋 Copyable Room ID*
- 🎨 Elegant UI with Tailwind and Lucide icons
- 🔄 Automatic scroll to latest message

---

## 📸 Preview
<img width="1739" height="829" alt="image" src="https://github.com/user-attachments/assets/e8e5df23-df75-46fb-bf6b-638bb7a403ae" />



<img width="1498" height="814" alt="image" src="https://github.com/user-attachments/assets/a446d1ff-30eb-4a7a-8665-fdf53120f1bd" />

---


  
## 📦 Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/aegischat-frontend.git
cd aegischat-backend

Environment Variable(.env): NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

npm install
nodemon server.js

