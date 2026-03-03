import express from "express";
import Trade from "../models/Trade.js";

const router = express.Router();

const normalizeNumber = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

router.get("/", async (_req, res) => {
  try {
    const trades = await Trade.find().sort({ date: -1, createdAt: -1 });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch trades." });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = {
      date: req.body.date ? new Date(req.body.date) : undefined,
      symbol: req.body.symbol,
      side: req.body.side === "short" ? "short" : "long",
      riskReward: req.body.riskReward,
      riskPercent: normalizeNumber(req.body.riskPercent),
      buyPrice: normalizeNumber(req.body.buyPrice),
      quantity: normalizeNumber(req.body.quantity),
      entryLogic: req.body.entryLogic,
      sellPrice: normalizeNumber(req.body.sellPrice),
      stopLoss: normalizeNumber(req.body.stopLoss),
      profitLoss: normalizeNumber(req.body.profitLoss),
      exitLogic: req.body.exitLogic,
      percent: normalizeNumber(req.body.percent),
      notes: req.body.notes,
    };

    const trade = await Trade.create(payload);
    res.status(201).json(trade);
  } catch (error) {
    res.status(400).json({ error: "Failed to create trade." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const payload = {
      date: req.body.date ? new Date(req.body.date) : undefined,
      symbol: req.body.symbol,
      side: req.body.side === "short" ? "short" : "long",
      riskReward: req.body.riskReward,
      riskPercent: normalizeNumber(req.body.riskPercent),
      buyPrice: normalizeNumber(req.body.buyPrice),
      quantity: normalizeNumber(req.body.quantity),
      entryLogic: req.body.entryLogic,
      sellPrice: normalizeNumber(req.body.sellPrice),
      stopLoss: normalizeNumber(req.body.stopLoss),
      profitLoss: normalizeNumber(req.body.profitLoss),
      exitLogic: req.body.exitLogic,
      percent: normalizeNumber(req.body.percent),
      notes: req.body.notes,
    };

    const trade = await Trade.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!trade) {
      return res.status(404).json({ error: "Trade not found." });
    }
    return res.json(trade);
  } catch (error) {
    return res.status(400).json({ error: "Failed to update trade." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const trade = await Trade.findByIdAndDelete(req.params.id);
    if (!trade) {
      return res.status(404).json({ error: "Trade not found." });
    }
    return res.json({ status: "deleted" });
  } catch (error) {
    return res.status(400).json({ error: "Failed to delete trade." });
  }
});

export default router;
