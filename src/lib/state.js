export const globalEvents = [];
export const incidentStore = [];
export const actionStore = [];
export const narrativeStore = [];
export const trendStore = new Map();
export const alertCooldown = new Map();
export const compareStore = [];
export const userMemory = new Map();

export const systemIdentity = {
  baselineRisk: 35,
  baselineVolume: 100,
  tolerance: 0.2,
  lastUpdated: Date.now(),
  learningCycles: 0,
  lastLearningAt: null
};

export const learningState = {
  enabled: true,
  minComparisons: 8,
  lastRunAt: 0
};
