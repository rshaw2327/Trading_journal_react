import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import tradesRouter from "./routes/trades.js";

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

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/trades", tradesRouter);

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
