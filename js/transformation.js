/**
 * CCX Transformation HUD v4.0
 * Deterministic Transformation Engine for SCN Documentation
 */

import { startLatencyCountdown } from './utils.js';

const scenarios = {
  housing: "Client reports unstable housing situation, currently staying with a friend. Referred to Community Housing Network for support. Follow-up pending next week.",
  food: "Patient mentioned difficulty affording groceries lately. Provided info and referral to local food pantry. Has not gone yet.",
  transport: "Client missed last appointment due to no transportation. Arranged ride assistance for next visit.",
  followup: "Follow-up with patient regarding prior referral. They confirmed services were received and issue resolved.",
  behavioral: "Client expressed increased stress and anxiety related to financial situation. Connected with behavioral health services through partner org. Intake scheduled.",
  mixed: "Spoke with client today. Main concern is housing but also mentioned food issues. Referred to housing services, gave info for SNAP. Will check back."
};

let SSOT = {
  raw_input: "",
  scrubbed_input: "",
  entities: {},
  confidence: {},
  audit_trace: []
};

let isLocked = false;

export function initTransformationHUD() {
  const scenarioSelector = document.getElementById('scenarioSelector');
  const inputArea = document.getElementById('transformationInput');
  const runBtn = document.getElementById('runTransformation');
  const confirmBtn = document.getElementById('confirmSSOT');
  const editBtn = document.getElementById('editInputFromDetection');
  
  if (!scenarioSelector || !inputArea || !runBtn) return;

  // Scenario Selection
  scenarioSelector.addEventListener('change', (e) => {
    if (isLocked) return;
    const key = e.target.value;
    if (scenarios[key]) {
      inputArea.value = scenarios[key];
    }
  });

  // Run Extraction
  runBtn.addEventListener('click', () => {
    if (isLocked) return;
    processInput(inputArea.value);
  });

  // Edit Input
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      isLocked = false;
      document.getElementById('detectionPanel').classList.add('hidden');
      document.getElementById('inputSection').classList.remove('locked');
      addAuditLog("Correction logic triggered: User returned to input layer.");
    });
  }

  // Confirm SSOT
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      generateOutputs();
    });
  }
}

function addAuditLog(msg) {
  const timestamp = new Date().toISOString();
  SSOT.audit_trace.push({ timestamp, message: msg });
  renderAuditTrace();
}

function renderAuditTrace() {
  const container = document.getElementById('auditLogContainer');
  if (!container) return;
  container.innerHTML = SSOT.audit_trace.map(log => `
    <div class="audit-log-item">
      <span class="timestamp">${log.timestamp.split('T')[1].split('.')[0]}Z</span>
      <span class="msg">${log.message}</span>
    </div>
  `).join('');
}

function processInput(text) {
  if (!text.trim()) return;

  // 1. Reset SSOT
  SSOT = {
    raw_input: text,
    scrubbed_input: "",
    entities: {},
    confidence: {},
    audit_trace: []
  };
  addAuditLog("Input received: " + text.substring(0, 30) + "...");

  // 2. PHI Scrubbing
  const scrubbed = scrubPHI(text);
  SSOT.scrubbed_input = scrubbed;
  addAuditLog("PHI Scrubbing complete: PII identifiers suppressed.");

  // 3. Extraction
  const entities = extractEntities(scrubbed);
  SSOT.entities = entities;
  
  // 4. Confidence Scoring
  SSOT.confidence = {
    need: entities.need ? 'HIGH' : 'LOW',
    action: entities.action ? 'HIGH' : 'LOW',
    status: entities.status ? 'HIGH' : 'LOW',
    provider: entities.provider ? 'HIGH' : 'LOW'
  };
  addAuditLog("Entity extraction concluded via deterministic rules.");

  renderDetectionPanel();
}

function scrubPHI(text) {
  // Simple regex-based scrubbing for demo
  let scrubbed = text.replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, "[REDACTED_NAME]");
  scrubbed = scrubbed.replace(/\d{3}-\d{2}-\d{4}/g, "[SSN_MASKED]");
  scrubbed = scrubbed.replace(/\b\d{10}\b/g, "[ID_TOKENIZED]");
  return scrubbed;
}

function extractEntities(text) {
  const t = text.toLowerCase();
  const entities = {
    need: null,
    action: null,
    status: 'pending',
    provider: null
  };

  // Need detection
  if (t.includes('housing')) entities.need = 'Housing';
  else if (t.includes('food') || t.includes('snap')) entities.need = 'Food';
  else if (t.includes('transport')) entities.need = 'Transportation';
  else if (t.includes('behavioral') || t.includes('anxiety') || t.includes('stress')) entities.need = 'Behavioral';

  // Action detection
  if (t.includes('referred') || t.includes('referral')) entities.action = 'Referred';
  else if (t.includes('scheduled')) entities.action = 'Scheduled';
  else if (t.includes('follow-up')) entities.action = 'Follow-up';
  else if (t.includes('provided') || t.includes('gave')) entities.action = 'Provided Info';

  // Status detection
  if (t.includes('completed') || t.includes('resolved') || t.includes('received')) entities.status = 'Completed';
  else if (t.includes('intake scheduled')) entities.status = 'Scheduled';
  else entities.status = 'Pending';

  // Provider detection (Look for "to [Org]")
  const providerMatch = text.match(/to ([\w\s]{3,30})(?: for|\.|$)/i);
  if (providerMatch) entities.provider = providerMatch[1].trim();

  return entities;
}

function renderDetectionPanel() {
  const panel = document.getElementById('detectionPanel');
  if (!panel) return;
  panel.classList.remove('hidden');
  
  const fields = ['need', 'action', 'provider', 'status'];
  fields.forEach(field => {
    const valEl = document.getElementById(`detect-${field}`);
    const confEl = document.getElementById(`conf-${field}`);
    const value = SSOT.entities[field] || "Not specified";
    const confidence = SSOT.confidence[field];
    
    if (valEl) valEl.textContent = value;
    if (confEl) {
      confEl.innerHTML = confidence === 'HIGH' ? '<span class="check">✔</span>' : '<span class="warn">⚠</span>';
      confEl.title = confidence === 'HIGH' ? 'High Confidence' : 'Requires Review';
    }
  });

  addAuditLog("Awaiting user confirmation of SSOT structure.");
}

function generateOutputs() {
  isLocked = true;
  document.getElementById('inputSection').classList.add('locked');
  document.getElementById('detectionPanel').classList.add('hidden');
  document.getElementById('outputSection').classList.remove('hidden');
  document.getElementById('auditPanel').classList.remove('hidden');

  addAuditLog("SSOT generation confirmed: Object locked.");
  addAuditLog("Transformation Engine executing transformations...");

  // 1. Grant Reporting
  renderOutput('out-grant', {
    "Service Category": SSOT.entities.need || "General Support",
    "Outcome Status": SSOT.entities.status,
    "Narrative": `Member identified with ${SSOT.entities.need || 'needs'}. Intervention: ${SSOT.entities.action || 'Contacted'}.`
  });

  // 2. SCN / 1115
  renderOutput('out-scn', {
    "Upstream Driver": SSOT.entities.need || "Social Care",
    "Referral Status": SSOT.entities.action === 'Referred' ? 'ACTIVE' : 'N/A',
    "Completion State": SSOT.entities.status.toUpperCase()
  });

  // 3. Compliance Mapping
  renderOutput('out-compliance', {
    "Classification": "Social Care Coordination",
    "Trace ID": "TX-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
    "Activity": `${SSOT.entities.need} address via ${SSOT.entities.action}`
  });

  // 4. CMS Billing
  renderOutput('out-billing', {
    "Suggestion": SSOT.entities.status === 'Completed' ? "G0019 (Closure)" : "Not Suggestible",
    "Confidence": SSOT.confidence.status,
    "HITL Flag": "MANDATORY REVIEW"
  });

  addAuditLog("Output layers synchronized successfully.");
  startLatencyCountdown();
}

function renderOutput(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = Object.entries(data).map(([key, val]) => `
    <div class="out-field">
      <span class="label">${key}</span>
      <span class="value">${val}</span>
    </div>
  `).join('');
}
