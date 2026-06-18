import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import tradesRouter from "./routes/trades.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.warn(
    "Missing MONGODB_URI. Add it to server/.env before starting the API.",
  );
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../dist")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/trades", tradesRouter);

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

mongoose
  .connect(mongoUri)
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
