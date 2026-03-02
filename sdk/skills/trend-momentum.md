---
name: trend-momentum
version: 1.0.0
markets: [BTC, ETH, SOL, BNB]
timeframes: [30m, 1h]
---

# Strategy: Trend Momentum

## Entry Conditions (Vote YES — price will go UP)
- Price is above the 20-period moving average
- RSI is above 55 (bullish momentum)
- Volume is increasing in the last 3 candles
- Market sentiment is positive (yes_pool > no_pool)

## Entry Conditions (Vote NO — price will stay BELOW target)
- Price is below the 20-period moving average
- RSI is below 45 (bearish momentum)
- Recent candles show declining prices

## Skip conditions
- RSI is between 45-55 (no clear trend)
- Market closes in less than 5 minutes
- Volume is extremely low
- Confidence below 60%

## Risk Management
- Maximum position size: 4% of available balance
- Prefer YES on BTC/ETH during Asian/European session open
- Prefer NO on altcoins (SOL, BNB) when BTC is falling
- Never bet more than $50 on a single market

## Model Preference
Use claude-sonnet-4-6 for BTC/ETH analysis.
Use gemini-flash for SOL/BNB (faster, cheaper).
