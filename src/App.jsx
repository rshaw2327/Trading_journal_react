import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./App.css";

const InfoIcon = ({ text }) => {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="info-icon"
      aria-label="Info"
      role="img"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      i
      {open &&
        createPortal(
          <div className="info-modal" aria-hidden="true">
            <div className="info-modal-backdrop" />
            <div className="info-modal-content">{text}</div>
          </div>,
          document.body,
        )}
    </span>
  );
};

function App() {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [trades, setTrades] = useState([]);
  const [newTrade, setNewTrade] = useState({
    date: "",
    symbol: "",
    side: "long",
    riskReward: "3:1",
    riskPercent: "1",
    buyPrice: "",
    quantity: "",
    entryLogic: "",
    sellPrice: "",
    stopLoss: "",
    profitLoss: "",
    exitLogic: "",
    percent: "",
    notes: "",
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeTimeRange, setActiveTimeRange] = useState("since-inception");
  const [symbolSideMap, setSymbolSideMap] = useState({});
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [editTrade, setEditTrade] = useState(null);
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const topScrollContentRef = useRef(null);

  const calculateProfitLoss = (
    buyPrice,
    sellPrice,
    quantity,
    side = "long",
  ) => {
    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(sellPrice) || 0;
    const qty = parseFloat(quantity) || 0;
    if (buy > 0 && sell > 0 && qty > 0) {
      const direction = side === "short" ? -1 : 1;
      return ((sell - buy) * qty * direction).toFixed(2);
    }
    return "";
  };

  const calculatePercent = (buyPrice, sellPrice, side = "long") => {
    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(sellPrice) || 0;
    if (buy > 0 && sell > 0) {
      const direction = side === "short" ? -1 : 1;
      return (((sell - buy) / buy) * 100 * direction).toFixed(2);
    }
    return "";
  };

  const parseRiskReward = (value) => {
    if (!value) return null;
    const [reward, risk] = value.split(":").map((part) => Number(part));
    if (!reward || !risk) return null;
    return reward / risk;
  };

  const applyRiskTargets = (trade) => {
    const buy = parseFloat(trade.buyPrice) || 0;
    const riskPercent = parseFloat(trade.riskPercent) || 0;
    const ratio = parseRiskReward(trade.riskReward);
    if (buy <= 0 || riskPercent <= 0 || !ratio) {
      return trade;
    }

    const riskAmount = buy * (riskPercent / 100);
    const isShort = trade.side === "short";
    const stopLoss = isShort ? buy + riskAmount : buy - riskAmount;
    const takeProfit = isShort
      ? buy - riskAmount * ratio
      : buy + riskAmount * ratio;

    return {
      ...trade,
      stopLoss: stopLoss.toFixed(2),
      sellPrice: takeProfit.toFixed(2),
    };
  };

  const handleInputChange = (field, value) => {
    setNewTrade((prev) => {
      let updated = { ...prev, [field]: value };
      if (field === "symbol" && symbolSideMap[value]) {
        updated.side = symbolSideMap[value];
      }

      if (
        field === "buyPrice" ||
        field === "riskPercent" ||
        field === "riskReward" ||
        field === "side"
      ) {
        updated = applyRiskTargets(updated);
      }

      // Auto-calculate profit/loss and percentage when relevant fields change
      if (
        field === "buyPrice" ||
        field === "sellPrice" ||
        field === "quantity" ||
        field === "side" ||
        field === "riskPercent" ||
        field === "riskReward"
      ) {
        const profitLoss = calculateProfitLoss(
          field === "buyPrice" ? value : updated.buyPrice,
          field === "sellPrice" ? value : updated.sellPrice,
          field === "quantity" ? value : updated.quantity,
          field === "side" ? value : updated.side,
        );
        const percent = calculatePercent(
          field === "buyPrice" ? value : updated.buyPrice,
          field === "sellPrice" ? value : updated.sellPrice,
          field === "side" ? value : updated.side,
        );
        updated.profitLoss = profitLoss;
        updated.percent = percent;
      }

      return updated;
    });
  };

  const handleEditChange = (field, value) => {
    setEditTrade((prev) => {
      if (!prev) return prev;
      let updated = { ...prev, [field]: value };

      if (
        field === "buyPrice" ||
        field === "riskPercent" ||
        field === "riskReward" ||
        field === "side"
      ) {
        updated = applyRiskTargets(updated);
      }

      if (
        field === "buyPrice" ||
        field === "sellPrice" ||
        field === "quantity" ||
        field === "side" ||
        field === "riskPercent" ||
        field === "riskReward"
      ) {
        const profitLoss = calculateProfitLoss(
          field === "buyPrice" ? value : updated.buyPrice,
          field === "sellPrice" ? value : updated.sellPrice,
          field === "quantity" ? value : updated.quantity,
          field === "side" ? value : updated.side,
        );
        const percent = calculatePercent(
          field === "buyPrice" ? value : updated.buyPrice,
          field === "sellPrice" ? value : updated.sellPrice,
          field === "side" ? value : updated.side,
        );
        updated.profitLoss = profitLoss;
        updated.percent = percent;
      }

      return updated;
    });
  };

  useEffect(() => {
    if (newTrade.symbol) {
      setSymbolSideMap((prev) => ({
        ...prev,
        [newTrade.symbol]: newTrade.side,
      }));
    }
  }, [newTrade.symbol, newTrade.side]);

  const resetNewTrade = () => {
    setNewTrade({
      date: "",
      symbol: "",
      side: "long",
      riskReward: "3:1",
      riskPercent: "1",
      buyPrice: "",
      quantity: "",
      entryLogic: "",
      sellPrice: "",
      stopLoss: "",
      profitLoss: "",
      exitLogic: "",
      percent: "",
      notes: "",
    });
  };

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await fetch(`${apiBase}/api/trades`);
        if (!response.ok) throw new Error("Failed to load trades");
        const data = await response.json();
        setTrades(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchTrades();
  }, [apiBase]);

  useEffect(() => {
    const topScroll = topScrollRef.current;
    const tableScroll = tableScrollRef.current;
    const topContent = topScrollContentRef.current;
    if (!topScroll || !tableScroll || !topContent) return;

    let syncing = false;

    const syncTopFromTable = () => {
      if (syncing) return;
      syncing = true;
      topScroll.scrollLeft = tableScroll.scrollLeft;
      syncing = false;
    };

    const syncTableFromTop = () => {
      if (syncing) return;
      syncing = true;
      tableScroll.scrollLeft = topScroll.scrollLeft;
      syncing = false;
    };

    const updateWidth = () => {
      topContent.style.width = `${tableScroll.scrollWidth}px`;
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    tableScroll.addEventListener("scroll", syncTopFromTable);
    topScroll.addEventListener("scroll", syncTableFromTop);

    return () => {
      window.removeEventListener("resize", updateWidth);
      tableScroll.removeEventListener("scroll", syncTopFromTable);
      topScroll.removeEventListener("scroll", syncTableFromTop);
    };
  }, [trades.length]);

  const handleAddTrade = async () => {
    if (newTrade.symbol && newTrade.buyPrice) {
      try {
        const response = await fetch(`${apiBase}/api/trades`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTrade),
        });
        if (!response.ok) throw new Error("Failed to save trade");
        const savedTrade = await response.json();
        setTrades((prev) => [savedTrade, ...prev]);
        resetNewTrade();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleDeleteTrade = async (tradeId) => {
    try {
      const response = await fetch(`${apiBase}/api/trades/${tradeId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete trade");
      setTrades((prev) =>
        prev.filter((trade) => (trade._id || trade.id) !== tradeId),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const startEditTrade = (trade) => {
    const tradeId = trade._id || trade.id;
    setEditingTradeId(tradeId);
    setEditTrade({
      ...trade,
      date: trade.date ? trade.date.slice(0, 10) : "",
      side: trade.side || "long",
    });
  };

  const cancelEditTrade = () => {
    setEditingTradeId(null);
    setEditTrade(null);
  };

  const saveEditTrade = async () => {
    if (!editTrade) return;
    try {
      const response = await fetch(`${apiBase}/api/trades/${editingTradeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editTrade),
      });
      if (!response.ok) throw new Error("Failed to update trade");
      const updatedTrade = await response.json();
      setTrades((prev) =>
        prev.map((trade) =>
          (trade._id || trade.id) === editingTradeId ? updatedTrade : trade,
        ),
      );
      cancelEditTrade();
    } catch (error) {
      console.error(error);
    }
  };

  const totalProfitLoss = trades.reduce((sum, trade) => {
    const pl =
      parseFloat(trade.profitLoss) ||
      parseFloat(
        calculateProfitLoss(
          trade.buyPrice,
          trade.sellPrice,
          trade.quantity,
          trade.side,
        ),
      ) ||
      0;
    return sum + pl;
  }, 0);

  const winRate =
    trades.length > 0
      ? (
          (trades.filter((t) => {
            const pl =
              parseFloat(t.profitLoss) ||
              parseFloat(
                calculateProfitLoss(
                  t.buyPrice,
                  t.sellPrice,
                  t.quantity,
                  t.side,
                ),
              ) ||
              0;
            return pl > 0;
          }).length /
            trades.length) *
          100
        ).toFixed(1)
      : 0;

  const totalTrades = trades.length;
  const avgReturn =
    trades.length > 0
      ? (
          trades.reduce((sum, trade) => {
            const percent =
              parseFloat(trade.percent) ||
              parseFloat(
                calculatePercent(trade.buyPrice, trade.sellPrice, trade.side),
              ) ||
              0;
            return sum + percent;
          }, 0) / trades.length
        ).toFixed(2)
      : 0;

  // Calculate Max Drawdown
  const calculateMaxDrawdown = () => {
    if (trades.length === 0) return 0;

    let cumulativePL = 0;
    let peak = 0;
    let maxDrawdown = 0;

    trades.forEach((trade) => {
      const pl =
        parseFloat(trade.profitLoss) ||
        parseFloat(
          calculateProfitLoss(trade.buyPrice, trade.sellPrice, trade.quantity),
        ) ||
        0;
      cumulativePL += pl;

      // Update peak if we've reached a new high
      if (cumulativePL > peak) {
        peak = cumulativePL;
      }

      // Calculate drawdown from peak
      const drawdown = cumulativePL - peak;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return maxDrawdown;
  };

  const maxDrawdown = calculateMaxDrawdown();

  // Calculate Sharpe Ratio
  const calculateSharpeRatio = () => {
    if (trades.length < 2) return 0; // Need at least 2 trades for meaningful calculation

    const returns = trades.map((trade) => {
      const percent =
        parseFloat(trade.percent) ||
        parseFloat(calculatePercent(trade.buyPrice, trade.sellPrice)) ||
        0;
      return percent;
    });

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Calculate standard deviation
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0; // Avoid division by zero

    // Sharpe Ratio = Average Return / Standard Deviation
    // (Assuming risk-free rate is 0 for simplicity)
    return avgReturn / stdDev;
  };

  // Calculate Sortino Ratio
  const calculateSortinoRatio = () => {
    if (trades.length < 2) return 0; // Need at least 2 trades for meaningful calculation

    const returns = trades.map((trade) => {
      const percent =
        parseFloat(trade.percent) ||
        parseFloat(calculatePercent(trade.buyPrice, trade.sellPrice)) ||
        0;
      return percent;
    });

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Calculate downside deviation (only negative returns)
    const negativeReturns = returns.filter((r) => r < 0);
    if (negativeReturns.length === 0) {
      // If no negative returns, Sortino is infinite/very high, return a high value
      return avgReturn > 0 ? 999 : 0;
    }

    const avgNegativeReturn =
      negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length;
    const downsideVariance =
      negativeReturns.reduce(
        (sum, r) => sum + Math.pow(r - avgNegativeReturn, 2),
        0,
      ) / negativeReturns.length;
    const downsideDev = Math.sqrt(downsideVariance);

    if (downsideDev === 0) return 0; // Avoid division by zero

    // Sortino Ratio = Average Return / Downside Deviation
    // (Assuming risk-free rate is 0 for simplicity)
    return avgReturn / downsideDev;
  };

  const sharpeRatio = calculateSharpeRatio();
  const sortinoRatio = calculateSortinoRatio();

  // Calculate Risk to Reward Ratio
  const calculateRiskToRewardRatio = () => {
    if (trades.length === 0) return 0;

    const validRatios = trades
      .map((trade) => {
        const buyPrice = parseFloat(trade.buyPrice) || 0;
        const sellPrice = parseFloat(trade.sellPrice) || 0;
        const stopLoss = parseFloat(trade.stopLoss) || 0;

        // Need both stop loss and sell price to calculate risk to reward
        if (buyPrice <= 0 || sellPrice <= 0 || stopLoss <= 0) return null;

        // Calculate risk (distance from entry to stop loss)
        const risk = Math.abs(buyPrice - stopLoss);

        // Calculate reward (distance from entry to sell price)
        const reward = Math.abs(sellPrice - buyPrice);

        if (risk === 0) return null; // Avoid division by zero

        // Risk to Reward Ratio = Reward / Risk
        return reward / risk;
      })
      .filter((ratio) => ratio !== null);

    if (validRatios.length === 0) return 0;

    // Return average risk to reward ratio
    const avgRatio =
      validRatios.reduce((sum, ratio) => sum + ratio, 0) / validRatios.length;
    return avgRatio;
  };

  const riskToRewardRatio = calculateRiskToRewardRatio();

  // Calculate Expectancy
  const calculateExpectancy = () => {
    if (trades.length === 0) return 0;

    const profits = trades.map((trade) => {
      const pl =
        parseFloat(trade.profitLoss) ||
        parseFloat(
          calculateProfitLoss(
            trade.buyPrice,
            trade.sellPrice,
            trade.quantity,
            trade.side,
          ),
        ) ||
        0;
      return pl;
    });

    const winningTrades = profits.filter((p) => p > 0);
    const losingTrades = profits.filter((p) => p < 0);

    const winRate = winningTrades.length / trades.length;
    const lossRate = losingTrades.length / trades.length;

    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, p) => sum + p, 0) / winningTrades.length
        : 0;
    const avgLoss =
      losingTrades.length > 0
        ? losingTrades.reduce((sum, p) => sum + p, 0) / losingTrades.length
        : 0;

    // Expectancy = (Win Rate × Average Win) - (Loss Rate × Average Loss)
    const expectancy = winRate * avgWin - lossRate * Math.abs(avgLoss);
    return expectancy;
  };

  // Calculate Recovery Factor
  const calculateRecoveryFactor = () => {
    if (trades.length === 0 || maxDrawdown === 0) return 0;

    // Recovery Factor = Net Profit / |Max Drawdown|
    const netProfit = totalProfitLoss;
    const absMaxDrawdown = Math.abs(maxDrawdown);
    if (absMaxDrawdown === 0) return 0;

    return netProfit / absMaxDrawdown;
  };

  // Calculate Rolling Sharpe Ratio
  const calculateRollingSharpe = () => {
    if (trades.length < 2) return 0;

    // Use last 20 trades for rolling Sharpe, or all trades if less than 20
    const windowSize = Math.min(20, trades.length);
    const recentTrades = trades.slice(-windowSize);

    const returns = recentTrades.map((trade) => {
      const percent =
        parseFloat(trade.percent) ||
        parseFloat(calculatePercent(trade.buyPrice, trade.sellPrice)) ||
        0;
      return percent;
    });

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Calculate standard deviation
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0; // Avoid division by zero

    // Rolling Sharpe Ratio = Average Return / Standard Deviation
    return avgReturn / stdDev;
  };

  const expectancy = calculateExpectancy();
  const recoveryFactor = calculateRecoveryFactor();
  const rollingSharpe = calculateRollingSharpe();
  const returnPercents = trades.map((trade) => {
    const percent =
      parseFloat(trade.percent) ||
      parseFloat(
        calculatePercent(trade.buyPrice, trade.sellPrice, trade.side),
      ) ||
      0;
    return percent;
  });
  const avgReturnPercent =
    returnPercents.length > 0
      ? returnPercents.reduce((sum, r) => sum + r, 0) / returnPercents.length
      : 0;
  const volatility =
    returnPercents.length > 1
      ? Math.sqrt(
          returnPercents.reduce(
            (sum, r) => sum + Math.pow(r - avgReturnPercent, 2),
            0,
          ) / returnPercents.length,
        )
      : 0;
  const negativeReturnPercents = returnPercents.filter((r) => r < 0);
  const avgNegativeReturn =
    negativeReturnPercents.length > 0
      ? negativeReturnPercents.reduce((sum, r) => sum + r, 0) /
        negativeReturnPercents.length
      : 0;
  const downsideDeviation =
    negativeReturnPercents.length > 0
      ? Math.sqrt(
          negativeReturnPercents.reduce(
            (sum, r) => sum + Math.pow(r - avgNegativeReturn, 2),
            0,
          ) / negativeReturnPercents.length,
        )
      : 0;
  const upReturns = returnPercents.filter((r) => r >= 0);
  const downReturns = returnPercents.filter((r) => r < 0);
  const avgUpReturn =
    upReturns.length > 0
      ? upReturns.reduce((sum, r) => sum + r, 0) / upReturns.length
      : 0;
  const avgDownReturn =
    downReturns.length > 0
      ? downReturns.reduce((sum, r) => sum + r, 0) / downReturns.length
      : 0;
  const drawdownClusterLengths = [];
  let currentStreak = 0;
  returnPercents.forEach((r) => {
    if (r < 0) {
      currentStreak += 1;
    } else if (currentStreak > 0) {
      drawdownClusterLengths.push(currentStreak);
      currentStreak = 0;
    }
  });
  if (currentStreak > 0) {
    drawdownClusterLengths.push(currentStreak);
  }
  const drawdownClustering =
    drawdownClusterLengths.length > 0
      ? drawdownClusterLengths.reduce((sum, n) => sum + n, 0) /
        drawdownClusterLengths.length
      : 0;
  const returnStdDev = volatility;
  const skew =
    returnPercents.length > 2 && returnStdDev !== 0
      ? returnPercents.reduce(
          (sum, r) => sum + Math.pow(r - avgReturnPercent, 3),
          0,
        ) /
        returnPercents.length /
        Math.pow(returnStdDev, 3)
      : 0;
  const kurtosis =
    returnPercents.length > 3 && returnStdDev !== 0
      ? returnPercents.reduce(
          (sum, r) => sum + Math.pow(r - avgReturnPercent, 4),
          0,
        ) /
        returnPercents.length /
        Math.pow(returnStdDev, 4)
      : 0;
  const sortedReturns = [...returnPercents].sort((a, b) => a - b);
  const cvarCount = sortedReturns.length
    ? Math.max(1, Math.floor(sortedReturns.length * 0.05))
    : 0;
  const conditionalVaR =
    cvarCount > 0
      ? sortedReturns.slice(0, cvarCount).reduce((sum, r) => sum + r, 0) /
        cvarCount
      : 0;
  const totalInvested = trades.reduce((sum, trade) => {
    const buy = parseFloat(trade.buyPrice) || 0;
    const qty = parseFloat(trade.quantity) || 0;
    return sum + buy * qty;
  }, 0);
  const endingValue = totalInvested + totalProfitLoss;
  const totalReturnPercent =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
  const tradeDates = trades
    .map((trade) => new Date(trade.date))
    .filter((date) => !Number.isNaN(date.getTime()));
  const yearsInMarket =
    tradeDates.length > 1
      ? (Math.max(...tradeDates) - Math.min(...tradeDates)) /
        (1000 * 60 * 60 * 24 * 365.25)
      : 0;
  const investmentMultiple =
    totalInvested > 0 ? endingValue / totalInvested : 0;
  const cagr =
    totalInvested > 0 && yearsInMarket > 0
      ? Math.pow(endingValue / totalInvested, 1 / yearsInMarket) - 1
      : 0;
  const annualizedReturn =
    yearsInMarket > 0 ? totalReturnPercent / yearsInMarket : 0;
  const tabTitles = {
    growth: "Growth Metrics",
    risk: "Risk Metrics",
    consistency: "Consistency Metrics",
    quant: "Quant Grade Analysis",
  };

  return (
    <div className="App">
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-title">Navigation</div>
          <nav className="sidebar-nav">
            <button
              className={`sidebar-tab ${
                activeTab === "dashboard" ? "active" : ""
              }`}
              type="button"
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`sidebar-tab ${
                activeTab === "time-range" ? "active" : ""
              }`}
              type="button"
              onClick={() => setActiveTab("time-range")}
            >
              Time Range Selector
            </button>
            <button
              className={`sidebar-tab ${
                activeTab === "growth" ? "active" : ""
              }`}
              type="button"
              onClick={() => setActiveTab("growth")}
            >
              Growth Metrics
            </button>
            <button
              className={`sidebar-tab ${activeTab === "risk" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("risk")}
            >
              Risk Metrics
            </button>
            <button
              className={`sidebar-tab ${
                activeTab === "consistency" ? "active" : ""
              }`}
              type="button"
              onClick={() => setActiveTab("consistency")}
            >
              Consistency Metrics
            </button>
            <button
              className={`sidebar-tab ${activeTab === "quant" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("quant")}
            >
              Quant Grade Analysis
            </button>
          </nav>
        </aside>

        <div className="main-content">
          <header className="dashboard-header">
            <div className="header-content">
              <h1>📈Trading Journal</h1>
              <p>Track your trades and analyze your performance</p>
            </div>
          </header>

          <div className="dashboard-container">
            {activeTab === "dashboard" && (
              <>
                {/* Statistics Cards */}
                <div className="stats-grid">
                  <div className="stat-card stat-card-1">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                      <h3>
                        Total P/L
                        <InfoIcon text="Sum of profit/loss for all trades. P/L = (Sell - Buy) * Qty." />
                      </h3>
                      <p
                        className={
                          totalProfitLoss >= 0 ? "positive" : "negative"
                        }
                      >
                        ${totalProfitLoss.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-2">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                      <h3>
                        Total Trades
                        <InfoIcon text="Count of all recorded trades." />
                      </h3>
                      <p>{totalTrades}</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-3">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-content">
                      <h3>
                        Win Rate
                        <InfoIcon text="Winning trades / total trades * 100%." />
                      </h3>
                      <p>{winRate}%</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-4">
                    <div className="stat-icon">📈</div>
                    <div className="stat-content">
                      <h3>
                        Avg Return
                        <InfoIcon text="Average of trade % returns. Return% = (Sell - Buy) / Buy * 100." />
                      </h3>
                      <p className={avgReturn >= 0 ? "positive" : "negative"}>
                        {avgReturn}%
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-5">
                    <div className="stat-icon">📉</div>
                    <div className="stat-content">
                      <h3>
                        Max Drawdown
                        <InfoIcon text="Largest peak-to-trough decline in cumulative P/L." />
                      </h3>
                      <p className="negative">${maxDrawdown.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-6">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-content">
                      <h3>
                        Sharpe Ratio
                        <InfoIcon text="Average return / standard deviation of returns (risk-free rate assumed 0)." />
                      </h3>
                      <p
                        className={
                          sharpeRatio >= 1
                            ? "positive"
                            : sharpeRatio >= 0
                              ? ""
                              : "negative"
                        }
                      >
                        {sharpeRatio.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-7">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-content">
                      <h3>
                        Sortino Ratio
                        <InfoIcon text="Average return / downside deviation (risk-free rate assumed 0)." />
                      </h3>
                      <p
                        className={
                          sortinoRatio >= 1
                            ? "positive"
                            : sortinoRatio >= 0
                              ? ""
                              : "negative"
                        }
                      >
                        {sortinoRatio === 999 ? "∞" : sortinoRatio.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-8">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-content">
                      <h3>
                        Risk to Reward
                        <InfoIcon text="Average of Reward / Risk. Reward = |Sell - Buy|, Risk = |Buy - Stop Loss|." />
                      </h3>
                      <p
                        className={
                          riskToRewardRatio >= 2
                            ? "positive"
                            : riskToRewardRatio >= 1
                              ? ""
                              : "negative"
                        }
                      >
                        {riskToRewardRatio.toFixed(2)}:1
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-9">
                    <div className="stat-icon">💎</div>
                    <div className="stat-content">
                      <h3>
                        Expectancy
                        <InfoIcon text="(Win Rate * Avg Win) - (Loss Rate * Avg Loss)." />
                      </h3>
                      <p className={expectancy >= 0 ? "positive" : "negative"}>
                        ${expectancy.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-10">
                    <div className="stat-icon">🔄</div>
                    <div className="stat-content">
                      <h3>
                        Recovery Factor
                        <InfoIcon text="Net Profit / |Max Drawdown|." />
                      </h3>
                      <p
                        className={
                          recoveryFactor >= 1 ? "positive" : "negative"
                        }
                      >
                        {recoveryFactor.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-11">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                      <h3>
                        Rolling Sharpe
                        <InfoIcon text="Sharpe ratio on the most recent 20 trades." />
                      </h3>
                      <p
                        className={
                          rollingSharpe >= 1
                            ? "positive"
                            : rollingSharpe >= 0
                              ? ""
                              : "negative"
                        }
                      >
                        {rollingSharpe.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trading Table */}
                <div className="table-container">
                  <div className="table-header">
                    <h2>Trade Entries</h2>
                    <button className="add-trade-btn" onClick={handleAddTrade}>
                      + Add New Trade
                    </button>
                  </div>

                  <div className="table-scrollbar" ref={topScrollRef}>
                    <div
                      className="table-scrollbar-content"
                      ref={topScrollContentRef}
                    />
                  </div>
                  <div className="table-wrapper" ref={tableScrollRef}>
                    <table className="trades-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Stock/Symbol</th>
                          <th>Side</th>
                          <th>R:R</th>
                          <th>Risk %</th>
                          <th>Buy Price</th>
                          <th>Quantity</th>
                          <th>Entry Logic</th>
                          <th>Sell Price</th>
                          <th>Stop Loss</th>
                          <th>Profit/Loss</th>
                          <th>Exit Logic</th>
                          <th>Percent %</th>
                          <th>Notes</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* New Trade Row */}
                        <tr className="new-trade-row">
                          <td>
                            <input
                              type="date"
                              value={newTrade.date}
                              onChange={(e) =>
                                handleInputChange("date", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="AAPL"
                              value={newTrade.symbol}
                              onChange={(e) =>
                                handleInputChange("symbol", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <select
                              value={newTrade.side}
                              onChange={(e) =>
                                handleInputChange("side", e.target.value)
                              }
                            >
                              <option value="long">Long</option>
                              <option value="short">Short</option>
                            </select>
                          </td>
                          <td>
                            <select
                              value={newTrade.riskReward}
                              onChange={(e) =>
                                handleInputChange("riskReward", e.target.value)
                              }
                            >
                              <option value="1:1">1:1</option>
                              <option value="2:1">2:1</option>
                              <option value="3:1">3:1</option>
                              <option value="4:1">4:1</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="1.0"
                              value={newTrade.riskPercent}
                              onChange={(e) =>
                                handleInputChange("riskPercent", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              value={newTrade.buyPrice}
                              onChange={(e) =>
                                handleInputChange("buyPrice", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              placeholder="0"
                              value={newTrade.quantity}
                              onChange={(e) =>
                                handleInputChange("quantity", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Breakout"
                              value={newTrade.entryLogic}
                              onChange={(e) =>
                                handleInputChange("entryLogic", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              value={newTrade.sellPrice}
                              onChange={(e) =>
                                handleInputChange("sellPrice", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              value={newTrade.stopLoss}
                              onChange={(e) =>
                                handleInputChange("stopLoss", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              placeholder="Auto-calculated"
                              step="0.01"
                              value={newTrade.profitLoss}
                              onChange={(e) =>
                                handleInputChange("profitLoss", e.target.value)
                              }
                              readOnly
                              className="calculated-field"
                              title="Automatically calculated from Buy Price, Sell Price, and Quantity"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Target hit"
                              value={newTrade.exitLogic}
                              onChange={(e) =>
                                handleInputChange("exitLogic", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              placeholder="Auto-calculated"
                              step="0.01"
                              value={newTrade.percent}
                              onChange={(e) =>
                                handleInputChange("percent", e.target.value)
                              }
                              readOnly
                              className="calculated-field"
                              title="Automatically calculated from Buy Price and Sell Price"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Notes"
                              value={newTrade.notes}
                              onChange={(e) =>
                                handleInputChange("notes", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <button
                              className="table-add-btn"
                              onClick={handleAddTrade}
                            >
                              ✓ Add
                            </button>
                          </td>
                        </tr>

                        {/* Existing Trades */}
                        {trades.map((trade) => {
                          // Calculate profit/loss and percentage for existing trades if not already set
                          const calculatedPL =
                            trade.profitLoss ||
                            calculateProfitLoss(
                              trade.buyPrice,
                              trade.sellPrice,
                              trade.quantity,
                              trade.side,
                            );
                          const calculatedPercent =
                            trade.percent ||
                            calculatePercent(
                              trade.buyPrice,
                              trade.sellPrice,
                              trade.side,
                            );

                          const plValue = parseFloat(calculatedPL || 0);
                          const percentValue = parseFloat(
                            calculatedPercent || 0,
                          );

                          const tradeId = trade._id || trade.id;

                          const isEditing = editingTradeId === tradeId;
                          const rowData = isEditing ? editTrade : trade;

                          return (
                            <tr key={tradeId} className="trade-row">
                              <td>
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={rowData?.date || ""}
                                    onChange={(e) =>
                                      handleEditChange("date", e.target.value)
                                    }
                                  />
                                ) : (
                                  trade.date || "-"
                                )}
                              </td>
                              <td className="symbol-cell">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData?.symbol || ""}
                                    onChange={(e) =>
                                      handleEditChange("symbol", e.target.value)
                                    }
                                  />
                                ) : (
                                  trade.symbol
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <select
                                    value={rowData?.side || "long"}
                                    onChange={(e) =>
                                      handleEditChange("side", e.target.value)
                                    }
                                  >
                                    <option value="long">Long</option>
                                    <option value="short">Short</option>
                                  </select>
                                ) : trade.side ? (
                                  trade.side.toUpperCase()
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <select
                                    value={rowData?.riskReward || "3:1"}
                                    onChange={(e) =>
                                      handleEditChange(
                                        "riskReward",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="1:1">1:1</option>
                                    <option value="2:1">2:1</option>
                                    <option value="3:1">3:1</option>
                                    <option value="4:1">4:1</option>
                                  </select>
                                ) : (
                                  trade.riskReward || "-"
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={rowData?.riskPercent || ""}
                                    onChange={(e) =>
                                      handleEditChange(
                                        "riskPercent",
                                        e.target.value,
                                      )
                                    }
                                  />
                                ) : trade.riskPercent ? (
                                  `${trade.riskPercent}%`
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={rowData?.buyPrice || ""}
                                    onChange={(e) =>
                                      handleEditChange(
                                        "buyPrice",
                                        e.target.value,
                                      )
                                    }
                                  />
                                ) : (
                                  `$${parseFloat(trade.buyPrice || 0).toFixed(2)}`
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={rowData?.quantity || ""}
                                    onChange={(e) =>
                                      handleEditChange(
                                        "quantity",
                                        e.target.value,
                                      )
                                    }
                                  />
                                ) : (
                                  trade.quantity || "-"
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData?.entryLogic || ""}
                                    onChange={(e) =>
                                      handleEditChange(
                                        "entryLogic",
                                        e.target.value,
                                      )
                                    }
                                  />
                                ) : (
                                  trade.entryLogic || "-"
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={rowData?.sellPrice || ""}
                                    onChange={(e) =>
                                      handleEditChange(
                                        "sellPrice",
                                        e.target.value,
                                      )
                                    }
                                  />
                                ) : (
                                  `$${parseFloat(trade.sellPrice || 0).toFixed(2)}`
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={rowData?.stopLoss || ""}
                                    onChange={(e) =>
                                      handleEditChange(
                                        "stopLoss",
                                        e.target.value,
                                      )
                                    }
                                  />
                                ) : (
                                  `$${parseFloat(trade.stopLoss || 0).toFixed(2)}`
                                )}
                              </td>
                              <td className={plValue >= 0 ? "profit" : "loss"}>
                                {isEditing
                                  ? `$${parseFloat(rowData?.profitLoss || 0).toFixed(2)}`
                                  : `$${plValue.toFixed(2)}`}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData?.exitLogic || ""}
                                    onChange={(e) =>
                                      handleEditChange(
                                        "exitLogic",
                                        e.target.value,
                                      )
                                    }
                                  />
                                ) : (
                                  trade.exitLogic || "-"
                                )}
                              </td>
                              <td
                                className={
                                  percentValue >= 0 ? "profit" : "loss"
                                }
                              >
                                {isEditing
                                  ? `${parseFloat(rowData?.percent || 0).toFixed(2)}%`
                                  : `${percentValue.toFixed(2)}%`}
                              </td>
                              <td className="notes-cell">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={rowData?.notes || ""}
                                    onChange={(e) =>
                                      handleEditChange("notes", e.target.value)
                                    }
                                  />
                                ) : (
                                  trade.notes || "-"
                                )}
                              </td>
                              <td className="action-cell">
                                {isEditing ? (
                                  <>
                                    <button
                                      className="table-add-btn"
                                      onClick={saveEditTrade}
                                    >
                                      💾
                                    </button>
                                    <button
                                      className="delete-btn"
                                      onClick={cancelEditTrade}
                                    >
                                      ✕
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      className="table-add-btn"
                                      onClick={() => startEditTrade(trade)}
                                    >
                                      ✎
                                    </button>
                                    <button
                                      className="delete-btn"
                                      onClick={() => handleDeleteTrade(tradeId)}
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === "time-range" && (
              <div className="tab-panel">
                <h2>Time Range Selector</h2>
                <div className="subtabs">
                  <button
                    className={`subtab ${
                      activeTimeRange === "since-inception" ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => setActiveTimeRange("since-inception")}
                  >
                    Since Inception
                  </button>
                  <button
                    className={`subtab ${
                      activeTimeRange === "ytd" ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => setActiveTimeRange("ytd")}
                  >
                    YTD
                  </button>
                  <button
                    className={`subtab ${
                      activeTimeRange === "custom" ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => setActiveTimeRange("custom")}
                  >
                    1Y/3Y/Custom
                  </button>
                </div>
                <div className="subtab-content">
                  <p className="tab-placeholder">
                    Selected range:{" "}
                    {activeTimeRange === "since-inception"
                      ? "Since Inception"
                      : activeTimeRange === "ytd"
                        ? "YTD"
                        : "1Y/3Y/Custom"}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "growth" && (
              <div className="tab-panel">
                <h2>Growth Metrics</h2>
                <div className="stats-grid">
                  <div className="stat-card stat-card-12">
                    <div className="stat-icon">📈</div>
                    <div className="stat-content">
                      <h3>
                        CAGR
                        <InfoIcon text="(Ending Value / Invested)^(1 / Years) - 1." />
                      </h3>
                      <p className={cagr >= 0 ? "positive" : "negative"}>
                        {(cagr * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-13">
                    <div className="stat-icon">🔁</div>
                    <div className="stat-content">
                      <h3>
                        Investment Multiple
                        <InfoIcon text="Ending Value / Total Invested." />
                      </h3>
                      <p className={investmentMultiple >= 1 ? "positive" : ""}>
                        {investmentMultiple.toFixed(2)}x
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-14">
                    <div className="stat-icon">🗓️</div>
                    <div className="stat-content">
                      <h3>
                        Annualized Return
                        <InfoIcon text="Total Return % / Years in market." />
                      </h3>
                      <p
                        className={
                          annualizedReturn >= 0 ? "positive" : "negative"
                        }
                      >
                        {annualizedReturn.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-15">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                      <h3>
                        Total Return
                        <InfoIcon text="Net P/L / Total Invested * 100%." />
                      </h3>
                      <p
                        className={
                          totalReturnPercent >= 0 ? "positive" : "negative"
                        }
                      >
                        {totalReturnPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "risk" && (
              <div className="tab-panel">
                <h2>Risk Metrics</h2>
                <div className="stats-grid">
                  <div className="stat-card stat-card-16">
                    <div className="stat-icon">📉</div>
                    <div className="stat-content">
                      <h3>
                        Max Drawdown
                        <InfoIcon text="Largest peak-to-trough decline in cumulative P/L." />
                      </h3>
                      <p className="negative">${maxDrawdown.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-17">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                      <h3>
                        Volatility
                        <InfoIcon text="Standard deviation of trade % returns." />
                      </h3>
                      <p>{volatility.toFixed(2)}%</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-18">
                    <div className="stat-icon">⬇️</div>
                    <div className="stat-content">
                      <h3>
                        Downside Deviation
                        <InfoIcon text="Standard deviation of negative trade % returns." />
                      </h3>
                      <p>{downsideDeviation.toFixed(2)}%</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-19">
                    <div className="stat-icon">🔄</div>
                    <div className="stat-content">
                      <h3>
                        Recovery Factor
                        <InfoIcon text="Net Profit / |Max Drawdown|." />
                      </h3>
                      <p
                        className={
                          recoveryFactor >= 1 ? "positive" : "negative"
                        }
                      >
                        {recoveryFactor.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "quant" && (
              <div className="tab-panel">
                <h2>Quant Grade Analysis</h2>
                <div className="stats-grid">
                  <div className="stat-card stat-card-20">
                    <div className="stat-icon">🧭</div>
                    <div className="stat-content">
                      <h3>
                        Regime-Based Returns
                        <InfoIcon text="Average return for up trades vs down trades." />
                      </h3>
                      <p>
                        Up {avgUpReturn.toFixed(2)}% / Down{" "}
                        {avgDownReturn.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-21">
                    <div className="stat-icon">🧱</div>
                    <div className="stat-content">
                      <h3>
                        Drawdown Clustering
                        <InfoIcon text="Average length of consecutive losing-trade streaks." />
                      </h3>
                      <p>{drawdownClustering.toFixed(2)} trades</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-22">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-content">
                      <h3>
                        Skew / Kurtosis
                        <InfoIcon text="3rd and 4th standardized moments of returns." />
                      </h3>
                      <p>
                        {skew.toFixed(2)} / {kurtosis.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-23">
                    <div className="stat-icon">🛡️</div>
                    <div className="stat-content">
                      <h3>
                        Conditional VaR (5%)
                        <InfoIcon text="Average of the worst 5% of returns." />
                      </h3>
                      <p className={conditionalVaR < 0 ? "negative" : ""}>
                        {conditionalVaR.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== "dashboard" &&
              activeTab !== "time-range" &&
              activeTab !== "growth" &&
              activeTab !== "risk" &&
              activeTab !== "quant" && (
                <div className="tab-panel">
                  <h2>{tabTitles[activeTab]}</h2>
                  <p className="tab-placeholder">
                    Add content for this section.
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
