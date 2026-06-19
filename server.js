import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getAIResponse } from "./ai.js";
import fetch from "node-fetch";

dotenv.config();

const app = express();

// ===================== MIDDLEWARE
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

app.use(express.json());

// ===================== HEALTH CHECK
app.get("/", (req, res) => {
  res.send("Theophilus AI backend running ✅");
});

// ===================== CHAT ROUTE (DO NOT TOUCH)
app.post("/chat", async (req, res) => {
  try {
    console.log("Chat request received:", req.body);

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message missing" });
    }

    const reply = await getAIResponse(message);

    res.json({ reply });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

// ===================== BIBLE ROUTE (FIXED FOR PHONE STABILITY)
app.get("/bible", async (req, res) => {
  try {
    let query = req.query.query;

    if (!query) {
      return res.status(400).json({ error: "Query missing" });
    }

    // ===================== NORMALIZE INPUT
    query = query.toString().trim();

    console.log("Bible request:", query);

    // ===================== TIMEOUT FIX (IMPORTANT FOR PHONE)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://bible-api.com/${encodeURIComponent(query)}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const data = await response.json();

    if (!data || data.error) {
      return res.status(500).json({ error: "Bible API error" });
    }

    res.json({
      reference: data.reference,
      text: data.text,
    });

  } catch (err) {
    console.error("BIBLE ERROR:", err.message);

    res.status(500).json({
      error: "Bible fetch failed or timeout"
    });
  }
});

// ===================== OTP STORAGE (UNCHANGED)
let users = {}; 
// format:
// {
//   "9999999999": { password: "1234", otp: "1111" }
// }

// ================= SIGNUP OTP =================
app.post("/send-otp", (req, res) => {
  const { phone } = req.body;

  if (!phone) return res.status(400).json({ error: "Phone required" });

  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  if (!users[phone]) {
    users[phone] = {};
  }

  users[phone].otp = otp;

  console.log("OTP for", phone, ":", otp);

  res.json({ message: "OTP sent successfully" });
});

// ================= VERIFY OTP & SET PASSWORD =================
app.post("/verify-otp", (req, res) => {
  const { phone, otp, password } = req.body;

  if (!users[phone] || users[phone].otp !== otp) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  users[phone].password = password;
  users[phone].otp = null;

  res.json({ message: "Account created successfully" });
});

// ================= LOGIN =================
app.post("/login", (req, res) => {
  const { phone, password } = req.body;

  if (!users[phone] || users[phone].password !== password) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  res.json({ message: "Login successful", phone });
});

// ===================== START SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});