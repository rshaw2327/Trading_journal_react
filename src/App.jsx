import { useState } from "react";
import "./App.css";

function App() {
  const [trades, setTrades] = useState([]);
  const [newTrade, setNewTrade] = useState({
    date: "",
    symbol: "",
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

  const calculateProfitLoss = (buyPrice, sellPrice, quantity) => {
    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(sellPrice) || 0;
    const qty = parseFloat(quantity) || 0;
    if (buy > 0 && sell > 0 && qty > 0) {
      return ((sell - buy) * qty).toFixed(2);
    }
    return "";
  };

  const calculatePercent = (buyPrice, sellPrice) => {
    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(sellPrice) || 0;
    if (buy > 0 && sell > 0) {
      return (((sell - buy) / buy) * 100).toFixed(2);
    }
    return "";
  };

  const handleInputChange = (field, value) => {
    setNewTrade((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate profit/loss and percentage when relevant fields change
      if (
        field === "buyPrice" ||
        field === "sellPrice" ||
        field === "quantity"
      ) {
        const profitLoss = calculateProfitLoss(
          field === "buyPrice" ? value : updated.buyPrice,
          field === "sellPrice" ? value : updated.sellPrice,
          field === "quantity" ? value : updated.quantity
        );
        const percent = calculatePercent(
          field === "buyPrice" ? value : updated.buyPrice,
          field === "sellPrice" ? value : updated.sellPrice
        );
        updated.profitLoss = profitLoss;
        updated.percent = percent;
      }

      return updated;
    });
  };

  const handleAddTrade = () => {
    if (newTrade.symbol && newTrade.buyPrice) {
      setTrades([...trades, { ...newTrade, id: Date.now() }]);
      setNewTrade({
        date: "",
        symbol: "",
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
    }
  };

  const totalProfitLoss = trades.reduce((sum, trade) => {
    const pl =
      parseFloat(trade.profitLoss) ||
      parseFloat(
        calculateProfitLoss(trade.buyPrice, trade.sellPrice, trade.quantity)
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
                calculateProfitLoss(t.buyPrice, t.sellPrice, t.quantity)
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
              parseFloat(calculatePercent(trade.buyPrice, trade.sellPrice)) ||
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
          calculateProfitLoss(trade.buyPrice, trade.sellPrice, trade.quantity)
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
        0
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
          calculateProfitLoss(trade.buyPrice, trade.sellPrice, trade.quantity)
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
      parseFloat(calculatePercent(trade.buyPrice, trade.sellPrice)) ||
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
            0
          ) / returnPercents.length
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
            0
          ) / negativeReturnPercents.length
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
          0
        ) /
        returnPercents.length /
        Math.pow(returnStdDev, 3)
      : 0;
  const kurtosis =
    returnPercents.length > 3 && returnStdDev !== 0
      ? returnPercents.reduce(
          (sum, r) => sum + Math.pow(r - avgReturnPercent, 4),
          0
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
                      <h3>Total P/L</h3>
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
                      <h3>Total Trades</h3>
                      <p>{totalTrades}</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-3">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-content">
                      <h3>Win Rate</h3>
                      <p>{winRate}%</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-4">
                    <div className="stat-icon">📈</div>
                    <div className="stat-content">
                      <h3>Avg Return</h3>
                      <p className={avgReturn >= 0 ? "positive" : "negative"}>
                        {avgReturn}%
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-5">
                    <div className="stat-icon">📉</div>
                    <div className="stat-content">
                      <h3>Max Drawdown</h3>
                      <p className="negative">${maxDrawdown.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-6">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-content">
                      <h3>Sharpe Ratio</h3>
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
                      <h3>Sortino Ratio</h3>
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
                      <h3>Risk to Reward</h3>
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
                      <h3>Expectancy</h3>
                      <p className={expectancy >= 0 ? "positive" : "negative"}>
                        ${expectancy.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-10">
                    <div className="stat-icon">🔄</div>
                    <div className="stat-content">
                      <h3>Recovery Factor</h3>
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
                      <h3>Rolling Sharpe</h3>
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

                  <div className="table-wrapper">
                    <table className="trades-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Stock/Symbol</th>
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
                              trade.quantity
                            );
                          const calculatedPercent =
                            trade.percent ||
                            calculatePercent(trade.buyPrice, trade.sellPrice);

                          const plValue = parseFloat(calculatedPL || 0);
                          const percentValue = parseFloat(
                            calculatedPercent || 0
                          );

                          return (
                            <tr key={trade.id} className="trade-row">
                              <td>{trade.date || "-"}</td>
                              <td className="symbol-cell">{trade.symbol}</td>
                              <td>
                                ${parseFloat(trade.buyPrice || 0).toFixed(2)}
                              </td>
                              <td>{trade.quantity || "-"}</td>
                              <td>{trade.entryLogic || "-"}</td>
                              <td>
                                ${parseFloat(trade.sellPrice || 0).toFixed(2)}
                              </td>
                              <td>
                                ${parseFloat(trade.stopLoss || 0).toFixed(2)}
                              </td>
                              <td className={plValue >= 0 ? "profit" : "loss"}>
                                ${plValue.toFixed(2)}
                              </td>
                              <td>{trade.exitLogic || "-"}</td>
                              <td
                                className={
                                  percentValue >= 0 ? "profit" : "loss"
                                }
                              >
                                {percentValue.toFixed(2)}%
                              </td>
                              <td className="notes-cell">
                                {trade.notes || "-"}
                              </td>
                              <td>
                                <button
                                  className="delete-btn"
                                  onClick={() =>
                                    setTrades(
                                      trades.filter((t) => t.id !== trade.id)
                                    )
                                  }
                                >
                                  🗑️
                                </button>
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
                      <h3>CAGR</h3>
                      <p className={cagr >= 0 ? "positive" : "negative"}>
                        {(cagr * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-13">
                    <div className="stat-icon">🔁</div>
                    <div className="stat-content">
                      <h3>Investment Multiple</h3>
                      <p className={investmentMultiple >= 1 ? "positive" : ""}>
                        {investmentMultiple.toFixed(2)}x
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-14">
                    <div className="stat-icon">🗓️</div>
                    <div className="stat-content">
                      <h3>Annualized Return</h3>
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
                      <h3>Total Return</h3>
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
                      <h3>Max Drawdown</h3>
                      <p className="negative">${maxDrawdown.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-17">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                      <h3>Volatility</h3>
                      <p>{volatility.toFixed(2)}%</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-18">
                    <div className="stat-icon">⬇️</div>
                    <div className="stat-content">
                      <h3>Downside Deviation</h3>
                      <p>{downsideDeviation.toFixed(2)}%</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-19">
                    <div className="stat-icon">🔄</div>
                    <div className="stat-content">
                      <h3>Recovery Factor</h3>
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
                      <h3>Regime-Based Returns</h3>
                      <p>
                        Up {avgUpReturn.toFixed(2)}% / Down{" "}
                        {avgDownReturn.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-21">
                    <div className="stat-icon">🧱</div>
                    <div className="stat-content">
                      <h3>Drawdown Clustering</h3>
                      <p>{drawdownClustering.toFixed(2)} trades</p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-22">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-content">
                      <h3>Skew / Kurtosis</h3>
                      <p>
                        {skew.toFixed(2)} / {kurtosis.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="stat-card stat-card-23">
                    <div className="stat-icon">🛡️</div>
                    <div className="stat-content">
                      <h3>Conditional VaR (5%)</h3>
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
