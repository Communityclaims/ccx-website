/**
 * CCX Revenue Integrity & Audit Risk Engine
 * NYS 1115 Waiver | 18 NYCRR §521
 */

import {
  ENCOUNTER_COST,
  MEAT_FAILURE,
  DENIAL_RATE,
  REWORK_COST,
  AUDIT_FAILURE_RATE,
  AUDIT_PROBABILITY,
  CONFIDENCE_LOW,
  CONFIDENCE_HIGH,
  SCREENING_MIN,
  SCREENING_MAX,
  REFERRAL_MIN,
  REFERRAL_MAX,
  FIDELITY_HIGH_RISK_THRESHOLD,
  FIDELITY_STABLE_THRESHOLD,
  NODE_COUNT,
  VERSION,
  DATA_VERSION
} from './constants.js';

const MONTHS_IN_YEAR    = 12;
const SCALING_THRESHOLD = 1000;

export function calculateOperationalLoss(volume) {
  const v = Number(volume);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return v * ENCOUNTER_COST * MEAT_FAILURE * MONTHS_IN_YEAR;
}

export function calculateDenialLoss(volume) {
  const v = Number(volume);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return v * DENIAL_RATE * REWORK_COST * MONTHS_IN_YEAR;
}

export function calculateScalingFactor(volume) {
  const v = Math.max(1, Number(volume) || 1);
  return v > SCALING_THRESHOLD ? 1 + Math.log10(v / SCALING_THRESHOLD) : 1;
}

export function calculateAuditExposure(totalLoss, volume = SCALING_THRESHOLD) {
  const loss = Number(totalLoss);
  if (!Number.isFinite(loss) || loss < 0) return 0;
  const scale = calculateScalingFactor(volume);
  return loss * AUDIT_FAILURE_RATE * AUDIT_PROBABILITY * scale;
}

export function confidenceBand(value) {
  const val = Number(value) || 0;
  return {
    low:  val * CONFIDENCE_LOW,
    high: val * CONFIDENCE_HIGH,
  };
}

export function calculateFidelity(screening, referral) {
  const s = Math.min(1, Math.max(0, Number(screening) || 0));
  const r = Math.min(1, Math.max(0, Number(referral) || 0));
  const rawScore = (s * 0.4) + (r * 0.3) + ((1 - MEAT_FAILURE) * 0.3);
  return Math.min(1, Math.max(0, rawScore));
}

export function classifyNode(fidelity) {
  const score = Math.min(1, Math.max(0, Number(fidelity) || 0));
  if (score < FIDELITY_HIGH_RISK_THRESHOLD) return 'High Audit Exposure';
  if (score < FIDELITY_STABLE_THRESHOLD)    return 'Documentation Risk';
  return 'Stable';
}

export function generateNodes(count = NODE_COUNT) {
  const total = Math.max(1, Math.floor(Number(count) || NODE_COUNT));
  const screeningSpan = SCREENING_MAX - SCREENING_MIN;
  const referralSpan  = REFERRAL_MAX - REFERRAL_MIN;
  const nodes = [];
  for (let i = 0; i < total; i++) {
    const screeningT = ((i * 1.37) % 1);
    const referralT  = ((i * 1.73 + 0.31) % 1);
    const screening = SCREENING_MIN + (screeningT * screeningSpan);
    const referral  = REFERRAL_MIN  + (referralT * referralSpan);
    const fidelity  = calculateFidelity(screening, referral);
    const tier      = classifyNode(fidelity);
    nodes.push({ id: i + 1, screening, referral, fidelity, tier });
  }
  return nodes;
}

export function computeNetworkAverages(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { screeningAvg: 0, referralAvg: 0, fidelityAvg: 0 };
  }
  let sumScreening = 0, sumReferral = 0, sumFidelity = 0;
  nodes.forEach(n => {
    sumScreening += Number(n.screening) || 0;
    sumReferral  += Number(n.referral) || 0;
    sumFidelity  += Number(n.fidelity) || 0;
  });
  return {
    screeningAvg: sumScreening / nodes.length,
    referralAvg:  sumReferral / nodes.length,
    fidelityAvg:  sumFidelity / nodes.length
  };
}

export function computeCustomAuditExposure(volume, failureRate, auditProb, multiplier) {
  const v  = Math.max(0, Number(volume) || 0);
  const fr = Math.min(1, Math.max(0, Number(failureRate) || 0));
  const ap = Math.min(1, Math.max(0, Number(auditProb) || 0));
  const m  = Math.max(1, Number(multiplier) || 1);
  const baseRisk = v * ENCOUNTER_COST * MEAT_FAILURE * 12; 
  const sampled = baseRisk * fr * ap;
  const extrapolated = sampled * m;
  return { totalLoss: baseRisk, sampled, extrapolated };
}

export function computeDiagnostic(volume, persona = 'scn') {
  const v = Math.max(1, Math.min(100_000, Number(volume) || 1));
  const p = String(persona).toLowerCase();
  
  const operational = calculateOperationalLoss(v);
  const denial      = calculateDenialLoss(v);
  const totalLoss   = operational + denial;
  
  // Persona-specific audit probability scaling
  let auditMultiplier = 1;
  if (p === 'payer') auditMultiplier = 1.25; // Payers see higher systematic exposure
  if (p === 'cbo') auditMultiplier = 0.85;   // CBOs focus on operational reclaim

  const audit = calculateAuditExposure(totalLoss, v) * auditMultiplier;

  return {
    volume,
    persona: p,
    operational,
    denial,
    totalLoss,
    audit,
    operationalBand:  confidenceBand(operational),
    denialBand:       confidenceBand(denial),
    auditBand:        confidenceBand(audit),
    totalBand:        confidenceBand(totalLoss + audit),
    nodes:            generateNodes(),
    version:          VERSION,
    dataVersion:      DATA_VERSION
  };
}
