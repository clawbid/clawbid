---
name: mean-reversion
version: 1.0.0
markets: [BTC, ETH, SOL, AVAX, ADA]
timeframes: [1h, 6h, 12h]
---

# Strategy: Mean Reversion

## Core Logic
When prices deviate significantly from their recent average,
they tend to revert back. Bet AGAINST extreme moves.

## Entry Conditions (Vote NO — extreme pump will reverse)
- Price has risen more than 3% in the last hour
- RSI above 75 (overbought)
- Price is significantly above 20-period MA (>2%)
- Bet that price will NOT stay above the target

## Entry Conditions (Vote YES — extreme dip will recover)
- Price has fallen more than 3% in the last hour
- RSI below 25 (oversold)
- Price is significantly below 20-period MA
- Bet that price WILL recover above the target

## Timeframe Preference
- 1h markets: Only trade with RSI > 80 or < 20
- 6h markets: Trade with RSI > 70 or < 30
- 12h markets: Trade with RSI > 65 or < 35

## Risk Management
- Maximum position: 3% of balance (more conservative)
- Skip if less than 10 minutes to close
- Skip if volume is very low (thin markets revert less reliably)
- Do not trade during major news events

## Model
Use claude-sonnet-4-6 for all analysis.
Fallback to gemini-flash if Claude is unavailable.
