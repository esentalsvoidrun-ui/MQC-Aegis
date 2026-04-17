# MQC Aegis

**From fragmented signals to operational action.**

MQC Aegis is a real-time decision engine for correlated risk. It ingests live events, detects patterns across signals, merges repeated hostile behavior, prioritizes operator attention, and recommends action in real time.

## What it does

- receives live risk events
- scores and classifies incidents
- correlates multi-signal behavior
- merges repeated hostile patterns into persistent cases
- recommends actions such as:
  - `block`
  - `manual_review`
  - `rate_limit`
  - `log`

## Core capabilities

- real-time event ingestion
- correlation logic
- incident creation and merge
- operator actions
- live dashboard
- incident drilldown
- filtering and search

## Stack

### Backend
- Node.js
- Express
- WebSocket (`ws`)
- SQLite

### Frontend
- HTML
- Vanilla JavaScript

## Local setup

### Install dependencies
```bash
npm install
