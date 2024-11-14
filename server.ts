import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();

// Schema MongoDB
const MessageSchema = new mongoose.Schema({
  text: String,
  username: String,
  createdAt: { type: Date, default: Date.now() },
});

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
});

const Message = mongoose.model("Message", MessageSchema);
const User = mongoose.model("User", UserSchema);

// Configuration serveur
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer);

// Connexion MongoDB
mongoose.connect(`${process.env.MONGODB_URI}/wavechat`);

// Routes API
app.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username, password });
    await user.save();
    res.status(201).json({ username });
  } catch (error) {
    res.status(400).json({ error: "Username déjà pris" });
  }
});

app.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    res.json({ username });
  } else {
    res.status(401).json({ error: "Identifiants incorrects" });
  }
});

// Socket.IO
io.on("connection", (socket) => {
  console.log("Un utilisateur connecté");

  socket.on("message", async (data) => {
    const message = new Message({
      text: data.text,
      username: data.username,
    });
    await message.save();
    io.emit("message", message);
  });

  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté");
  });
});

// Récupération des anciens messages
app.get("/messages", async (req: Request, res: Response) => {
  const messages = await Message.find().sort({ createdAt: -1 }).limit(50);
  res.json(messages);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
