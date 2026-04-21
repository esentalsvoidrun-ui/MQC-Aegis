import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { safeJson } from "./utils.js";

export async function initDb() {
  const db = await open({
    filename: "./signaldesk.db",
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      user TEXT,
      riskScore INTEGER,
      severity TEXT,
      action TEXT,
      status TEXT,
      ip TEXT,
      amount REAL,
      reasonCodes TEXT,
      correlationLabel TEXT,
      trendLabel TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS narratives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT,
      summary TEXT,
      pattern TEXT,
      learning TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS engine_comparisons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId INTEGER,
      eventType TEXT,
      user TEXT,
      localRiskScore INTEGER,
      mergedRiskScore INTEGER,
      localAction TEXT,
      finalAction TEXT,
      localLabel TEXT,
      finalLabel TEXT,
      localConfidence TEXT,
      finalConfidence TEXT,
      localSource TEXT,
      finalSource TEXT,
      mqcEnabled INTEGER,
      mqcMode TEXT,
      mqcRiskDelta INTEGER,
      mqcRecommendedAction TEXT,
      mqcLabel TEXT,
      mqcConfidence TEXT,
      differs INTEGER,
      promotedByMQC INTEGER,
      payload TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS learning_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      previousBaselineRisk INTEGER,
      newBaselineRisk INTEGER,
      previousBaselineVolume INTEGER,
      newBaselineVolume INTEGER,
      previousTolerance REAL,
      newTolerance REAL,
      diffRate REAL,
      promotionRate REAL,
      samples INTEGER,
      note TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS user_memory (
      user TEXT PRIMARY KEY,
      totalEvents INTEGER DEFAULT 0,
      totalIncidents INTEGER DEFAULT 0,
      totalActions INTEGER DEFAULT 0,
      avgRisk REAL DEFAULT 0,
      lastRisk REAL DEFAULT 0,
      trustScore INTEGER DEFAULT 50,
      riskMomentum REAL DEFAULT 0,
      lastAction TEXT,
      lastSeverity TEXT,
      knownIpCount INTEGER DEFAULT 0,
      knownIps TEXT DEFAULT '[]',
      lastSeenAt TEXT,
      updatedAt TEXT
    );
  `);

  return db;
}

export async function persistIncident(db, incident) {
  await db.run(
    `
    INSERT INTO incidents
    (type, user, riskScore, severity, action, status, ip, amount, reasonCodes, correlationLabel, trendLabel, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      incident.type,
      incident.user,
      incident.riskScore,
      incident.severity,
      incident.action,
      incident.status,
      incident.ip,
      incident.amount,
      safeJson(incident.reasonCodes),
      incident.correlationLabel,
      incident.trendLabel,
      incident.createdAt
    ]
  );
}

export async function persistNarrative(db, narrative) {
  await db.run(
    `
    INSERT INTO narratives
    (user, summary, pattern, learning, timestamp)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      narrative.user,
      narrative.summary,
      narrative.pattern,
      narrative.learning,
      narrative.timestamp
    ]
  );
}

export async function persistComparison(db, comp) {
  await db.run(
    `
    INSERT INTO engine_comparisons
    (
      eventId, eventType, user, localRiskScore, mergedRiskScore,
      localAction, finalAction, localLabel, finalLabel,
      localConfidence, finalConfidence, localSource, finalSource,
      mqcEnabled, mqcMode, mqcRiskDelta, mqcRecommendedAction,
      mqcLabel, mqcConfidence, differs, promotedByMQC, payload, createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      comp.eventId,
      comp.eventType,
      comp.user,
      comp.localRiskScore,
      comp.mergedRiskScore,
      comp.localAction,
      comp.finalAction,
      comp.localLabel,
      comp.finalLabel,
      comp.localConfidence,
      comp.finalConfidence,
      comp.localSource,
      comp.finalSource,
      comp.mqcEnabled ? 1 : 0,
      comp.mqcMode,
      comp.mqcRiskDelta,
      comp.mqcRecommendedAction,
      comp.mqcLabel,
      comp.mqcConfidence,
      comp.differs ? 1 : 0,
      comp.promotedByMQC ? 1 : 0,
      safeJson(comp.payload, {}),
      comp.createdAt
    ]
  );
}

export async function persistLearningLog(db, log) {
  await db.run(
    `
    INSERT INTO learning_log
    (
      previousBaselineRisk, newBaselineRisk,
      previousBaselineVolume, newBaselineVolume,
      previousTolerance, newTolerance,
      diffRate, promotionRate, samples, note, createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      log.previousBaselineRisk,
      log.newBaselineRisk,
      log.previousBaselineVolume,
      log.newBaselineVolume,
      log.previousTolerance,
      log.newTolerance,
      log.diffRate,
      log.promotionRate,
      log.samples,
      log.note,
      log.createdAt
    ]
  );
}
