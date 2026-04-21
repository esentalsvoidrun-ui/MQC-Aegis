import { clamp, nowIso, parseJsonSafe, safeJson } from "./utils.js";

export async function loadUserMemory(db, userMemory) {
  const rows = await db.all(`SELECT * FROM user_memory`);
  for (const row of rows) {
    userMemory.set(row.user, {
      user: row.user,
      totalEvents: Number(row.totalEvents || 0),
      totalIncidents: Number(row.totalIncidents || 0),
      totalActions: Number(row.totalActions || 0),
      avgRisk: Number(row.avgRisk || 0),
      lastRisk: Number(row.lastRisk || 0),
      trustScore: Number(row.trustScore || 50),
      riskMomentum: Number(row.riskMomentum || 0),
      lastAction: row.lastAction || null,
      lastSeverity: row.lastSeverity || null,
      knownIpCount: Number(row.knownIpCount || 0),
      knownIps: parseJsonSafe(row.knownIps, []),
      lastSeenAt: row.lastSeenAt || null,
      updatedAt: row.updatedAt || null
    });
  }
}

export function getUserMemory(userMemory, user) {
  if (!userMemory.has(user)) {
    userMemory.set(user, {
      user,
      totalEvents: 0,
      totalIncidents: 0,
      totalActions: 0,
      avgRisk: 0,
      lastRisk: 0,
      trustScore: 50,
      riskMomentum: 0,
      lastAction: null,
      lastSeverity: null,
      knownIpCount: 0,
      knownIps: [],
      lastSeenAt: null,
      updatedAt: null
    });
  }
  return userMemory.get(user);
}

export async function persistUserMemory(db, mem) {
  await db.run(
    `
    INSERT INTO user_memory (
      user, totalEvents, totalIncidents, totalActions, avgRisk, lastRisk,
      trustScore, riskMomentum, lastAction, lastSeverity, knownIpCount,
      knownIps, lastSeenAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user) DO UPDATE SET
      totalEvents=excluded.totalEvents,
      totalIncidents=excluded.totalIncidents,
      totalActions=excluded.totalActions,
      avgRisk=excluded.avgRisk,
      lastRisk=excluded.lastRisk,
      trustScore=excluded.trustScore,
      riskMomentum=excluded.riskMomentum,
      lastAction=excluded.lastAction,
      lastSeverity=excluded.lastSeverity,
      knownIpCount=excluded.knownIpCount,
      knownIps=excluded.knownIps,
      lastSeenAt=excluded.lastSeenAt,
      updatedAt=excluded.updatedAt
    `,
    [
      mem.user,
      mem.totalEvents,
      mem.totalIncidents,
      mem.totalActions,
      mem.avgRisk,
      mem.lastRisk,
      mem.trustScore,
      mem.riskMomentum,
      mem.lastAction,
      mem.lastSeverity,
      mem.knownIpCount,
      safeJson(mem.knownIps, []),
      mem.lastSeenAt,
      mem.updatedAt
    ]
  );
}

export function applyUserMemoryToRisk(event, baseRiskScore, mem) {
  let adjusted = baseRiskScore;
  const factors = [];

  if (mem.totalEvents >= 5 && mem.trustScore >= 70 && !event.geoMismatch && !event.velocitySpike) {
    adjusted -= 6;
    factors.push("trusted_user_discount");
  }

  if (mem.totalIncidents >= 3) {
    adjusted += 7;
    factors.push("repeat_incident_history");
  } else if (mem.totalIncidents >= 1) {
    adjusted += 3;
    factors.push("prior_incident_history");
  }

  if (mem.riskMomentum >= 15) {
    adjusted += 6;
    factors.push("risk_momentum_high");
  } else if (mem.riskMomentum <= -10) {
    adjusted -= 4;
    factors.push("risk_momentum_low");
  }

  const ip = (event.ip || "").trim();
  if (ip && ip !== "unknown") {
    if (mem.knownIps.includes(ip)) {
      adjusted -= 5;
      factors.push("known_ip_discount");
    } else if (mem.totalEvents >= 3) {
      adjusted += 4;
      factors.push("new_ip_penalty");
    }
  }

  if (mem.lastAction === "block") {
    adjusted += 6;
    factors.push("prior_block_history");
  } else if (mem.lastAction === "manual_review") {
    adjusted += 3;
    factors.push("prior_review_history");
  }

  return {
    adjustedRiskScore: Math.round(clamp(adjusted, 0, 100)),
    factors
  };
}

export async function updateUserMemoryFromEvent(db, userMemory, event) {
  const mem = getUserMemory(userMemory, event.user);
  const previousAvg = mem.avgRisk;
  const nextEvents = mem.totalEvents + 1;
  const nextAvg = nextEvents > 0
    ? ((mem.avgRisk * mem.totalEvents) + Number(event.risk || 0)) / nextEvents
    : Number(event.risk || 0);

  mem.totalEvents = nextEvents;
  mem.avgRisk = Number(nextAvg.toFixed(2));
  mem.lastRisk = Number(event.risk || 0);
  mem.riskMomentum = Number((mem.lastRisk - previousAvg).toFixed(2));

  const ip = (event.ip || "").trim();
  if (ip && ip !== "unknown" && !mem.knownIps.includes(ip)) {
    mem.knownIps.push(ip);
  }
  mem.knownIps = mem.knownIps.slice(-10);
  mem.knownIpCount = mem.knownIps.length;
  mem.lastSeenAt = nowIso();
  mem.updatedAt = nowIso();

  await persistUserMemory(db, mem);
  return mem;
}

export async function updateUserMemoryFromDecision(db, mem, event, incident, actionRecord) {
  if (incident) mem.totalIncidents += 1;
  if (actionRecord) mem.totalActions += 1;

  if (actionRecord?.type === "block") mem.trustScore -= 12;
  else if (actionRecord?.type === "manual_review") mem.trustScore -= 6;
  else if (actionRecord?.type === "rate_limit") mem.trustScore -= 3;
  else mem.trustScore += 1;

  if (!incident && !event.geoMismatch && !event.velocitySpike && Number(event.risk || 0) < 45) {
    mem.trustScore += 2;
  }

  mem.trustScore = clamp(Math.round(mem.trustScore), 0, 100);
  mem.lastAction = actionRecord?.type || mem.lastAction;
  mem.lastSeverity = incident?.severity || mem.lastSeverity;
  mem.updatedAt = nowIso();

  await persistUserMemory(db, mem);
  return mem;
}
