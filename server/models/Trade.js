import mongoose from "mongoose";

const tradeSchema = new mongoose.Schema(
  {
    date: { type: Date },
    symbol: { type: String, required: true, trim: true },
    side: { type: String, enum: ["long", "short"], default: "long" },
    riskReward: { type: String, default: "3:1" },
    riskPercent: { type: Number },
    buyPrice: { type: Number },
    quantity: { type: Number },
    entryLogic: { type: String, trim: true },
    sellPrice: { type: Number },
    stopLoss: { type: Number },
    profitLoss: { type: Number },
    exitLogic: { type: String, trim: true },
    percent: { type: Number },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

const Trade = mongoose.model("Trade", tradeSchema);

export default Trade;
