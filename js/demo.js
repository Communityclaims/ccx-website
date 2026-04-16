/**
 * Workflow Transformation Engine Demo Logic
 * CCX Engineering - Forensic Interaction Layer
 */

import { startLatencyCountdown } from './utils.js';

export function initLandingDemo() {
  const trigger = document.getElementById('triggerDemo');
  if (trigger) {
    trigger.addEventListener('click', runDemoAnimation);
  }

  // Tab switching logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      // Update buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update content
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });
}

function scrubPHI(data) {
  // Surrogate PHI Scrubbing Layer (Simulated for Demo Lifecycle)
  return {
    patient_name: 'ENC_ID_8829',
    medicaid_id: 'TOKEN_SHA256_ACTIVE',
    need: data.need,
    action: data.action,
    timestamp: data.timestamp,
    status: 'PHI_SAFE'
  };
}

function normalizeToSSOT(scrubbedData) {
  return {
    id: 'SSOT-TX-' + Math.floor(Math.random() * 100000),
    member: { deid: scrubbedData.patient_name, token: scrubbedData.medicaid_id },
    clinical: { primary_need: scrubbedData.need, action: scrubbedData.action },
    metadata: { version: '2.4.2', ts: scrubbedData.timestamp, source: 'CBO_ENTRY' }
  };
}

export function runDemoAnimation() {
  const canvas = document.getElementById('demoCanvas');
  const leftPanel = document.getElementById('leftPanel');
  const rightPanel = document.getElementById('rightPanel');
  const inputRows = document.querySelectorAll('#inputTable tr');
  const outputRows = document.querySelectorAll('.out-row');
  const initialMsg = document.getElementById('initialMsg');
  const counter = document.getElementById('demoCounter');
  const trigger = document.getElementById('triggerDemo');
  const processingState = document.getElementById('processingState');
  const traceSteps = document.querySelectorAll('.trace-step');
  const ssotBridge = document.getElementById('ssotBridge');
  const ssotJson = document.getElementById('ssotJson');
  const causalOverlay = document.getElementById('causalOverlay');
  
  if (!canvas || !leftPanel || !rightPanel || !trigger) return;

  // Reset UI
  trigger.disabled = true;
  leftPanel.classList.remove('scanning');
  initialMsg.classList.remove('hidden');
  counter.classList.remove('complete');
  counter.textContent = '0.00s';
  processingState.textContent = 'Initiating...';
  if (ssotBridge) ssotBridge.classList.add('hidden');
  if (causalOverlay) causalOverlay.innerHTML = '';
  
  inputRows.forEach(row => row.classList.remove('active', 'processed'));
  outputRows.forEach(row => row.classList.remove('visible'));
  traceSteps.forEach(step => step.classList.remove('active'));

  // Step 1: Start Scan
  setTimeout(() => {
    leftPanel.classList.add('scanning');
  }, 50);

  // Processing State Loop
  const states = ['Scrubbing PHI...', 'Normalizing SSOT...', 'Mapping Reporting Layer...'];
  let stateIdx = 0;
  const stateInterval = setInterval(() => {
    processingState.textContent = states[stateIdx % states.length];
    stateIdx++;
  }, 150);

  // Step 2: Extraction sequence
  const totalDuration = 500;
  const rowInterval = totalDuration / inputRows.length;

  let currentCounter = 0;
  const counterInterval = setInterval(() => {
    currentCounter += 0.05;
    if (currentCounter >= 0.50) {
      counter.textContent = '0.50s';
      clearInterval(counterInterval);
    } else {
      counter.textContent = currentCounter.toFixed(2) + 's';
    }
  }, 50);

  // Trace Steps Activation
  setTimeout(() => traceSteps[0].classList.add('active'), 50);
  setTimeout(() => traceSteps[1].classList.add('active'), 200);
  setTimeout(() => traceSteps[2].classList.add('active'), 400);

  // Mock SSOT generation
  const mockRaw = { need: 'Housing instability', action: 'Referral submitted', timestamp: '2026-04-16T13:42:00Z' };
  const ssot = normalizeToSSOT(scrubPHI(mockRaw));
  
  inputRows.forEach((row, index) => {
    setTimeout(() => {
      row.classList.add('active');
      
      // Map to Clinical view (Tab 1)
      if (index === 0) initialMsg.classList.add('hidden');
      
      if (outputRows[index]) {
        outputRows[index].classList.add('visible');
        drawCausalLine(row, outputRows[index], causalOverlay);
      }

      setTimeout(() => {
        row.classList.remove('active');
        row.classList.add('processed');
      }, rowInterval * 0.8);

      if (index === inputRows.length - 1) {
        setTimeout(() => {
          clearInterval(stateInterval);
          if (ssotBridge && ssotJson) {
            ssotBridge.classList.remove('hidden');
            ssotJson.textContent = JSON.stringify(ssot, null, 2);
          }
          completeDemo();
        }, rowInterval);
      }
    }, index * rowInterval);
  });

  function drawCausalLine(startEl, endEl, svg) {
    if (!svg) return;
    const svgRect = svg.getBoundingClientRect();
    const startRect = startEl.getBoundingClientRect();
    const endRect = endEl.getBoundingClientRect();

    const x1 = startRect.right - svgRect.left;
    const y1 = startRect.top + (startRect.height / 2) - svgRect.top;
    const x2 = endRect.left - svgRect.left;
    const y2 = endRect.top + (endRect.height / 2) - svgRect.top;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#00ff41');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('opacity', '0.5');
    svg.appendChild(line);

    setTimeout(() => line.remove(), 400);
  }

  function completeDemo() {
    processingState.textContent = 'Transformation Complete';
    counter.classList.add('complete');
    
    startLatencyCountdown();

    setTimeout(() => {
      trigger.disabled = false;
      trigger.textContent = 'Run Again';
    }, 2000);
  }
}
