export const state = {
  globalEvents: [],
  incidents: [],
  actions: [],
  narratives: [],
  trendStore: new Map(),
  userHistory: new Map(),
  alertCooldown: new Map(),
  drift: {
    driftScore: 0,
    status: "stable",
    baselineRisk: 35,
    baselineVolume: 100,
    currentRisk: 0,
    currentVolume: 0
  }
};
