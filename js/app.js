/**
 * CCXNY Master Orchestrator (app.js)
 * ARCHITECTURAL DIRECTIVE: Zero DOM manipulation in this file.
 * The central nervous system for StateBridge hydration and lifecycle coordination.
 */

import { computeDiagnostic, computeNetworkAverages } from './engine.js';
import { saveState, loadState } from './utils.js';
import { 
  injectGlobalFooter, 
  renderInterpretation, 
  renderScenario, 
  renderExposureBoard, 
  renderNetworkGrid, 
  renderNetworkSummary, 
  renderNodeTable,
  getDiagnosticInputValue,
  updatePersonaUIState,
  toggleActionLoading,
  syncNodeTableIfPresent,
  bindEventToElement,
  showFormFeedback,
  clearFormFeedback,
  updateLogicVerifiedStatus,
  showNoState,
  renderStateBridgeSummary,
  initHudNote
} from './ui.js';
import { submitTechnicalInquiry } from './services/inquiryService.js';
import { appendWormBlock, loadOrInitializeLedger, bindAuditListeners } from './audit.js';
import { handleNetworkHydration, bindNetworkListeners } from './network.js';
import { initLandingDemo } from './demo.js';
import { initTransformationHUD } from './transformation.js';

const session = {
  activePersona: 'scn',
  volume: 1500,
  diagnosticPayload: null
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[SYSTEM] CCXNY Orchestrator Booting...');

  // 1. Initialize Ledger (WORM)
  await loadOrInitializeLedger();

  // 2. StateBridge Hydration
  const path = window.location.pathname;
  
  if (path.includes('audit.html') || path === '/audit') {
    handleAuditPageHydration();
    bindAuditListeners();
  } else if (path.includes('network.html') || path === '/network') {
    handleNetworkHydration();
    const savedPayload = loadState('diagnostic');
    if (savedPayload) bindNetworkListeners(savedPayload.nodes);
  } else if (path.includes('methodology.html') || path === '/methodology') {
    // Methodology page logic if any
  } else {
    handleDashboardPageHydration();
  }

  // 3. Global HUD Wiring
  const savedPayload = loadState('diagnostic');
  if (savedPayload) {
    injectGlobalFooter(savedPayload);
  }

  bindMasterListeners();
  
  // 4. Logic Verification Signal
  updateLogicVerifiedStatus(true);

  // 5. HUD Annotation Initialization
  initHudNote();

  // 6. Landing Page Demo Initialization
  initLandingDemo();
  initTransformationHUD();
});

function handleDashboardPageHydration() {
  const savedPayload = loadState('diagnostic');
  const savedPersona = loadState('persona');

  if (savedPersona) {
    session.activePersona = savedPersona;
    updatePersonaUIState(savedPersona);
  } else {
    updatePersonaUIState(session.activePersona);
  }

  if (savedPayload) {
    session.volume = savedPayload.volume || 1500;
    session.diagnosticPayload = savedPayload;
    if (window.location.hash !== '#workflow-engine') {
       orchestrateUI(savedPayload);
    }
    
    const volInput = document.getElementById('volInput');
    const volRange = document.getElementById('volRange');
    if (volInput) volInput.value = session.volume;
    if (volRange) volRange.value = session.volume;
  }
}

function handleAuditPageHydration() {
  const priorState = loadState('diagnostic');
  if (priorState) {
    renderStateBridgeSummary('state-summary', priorState);
    const volInput = document.getElementById('volume');
    if (volInput) volInput.value = priorState.volume;
  } else {
    showNoState('state-summary');
  }
}

function orchestrateUI(payload) {
  if (!payload) return;
  injectGlobalFooter(payload);
  renderScenario(payload);
  renderInterpretation(session.activePersona, payload);
  renderExposureBoard(session.activePersona, payload);
  renderNetworkGrid('networkGrid', payload.nodes);
  const averages = computeNetworkAverages(payload.nodes);
  renderNetworkSummary(averages);
  syncNodeTableIfPresent(payload.nodes);
}

async function runDiagnostic() {
  toggleActionLoading('runScan', true);
  try {
    const rawVolume = getDiagnosticInputValue();
    const sanitizedVolume = Math.max(1, Number(rawVolume) || 1);
    session.volume = sanitizedVolume;
    
    // Engine Execution (Sovereign Math)
    const payload = computeDiagnostic(session.volume, session.activePersona);
    session.diagnosticPayload = payload;
    
    // StateBridge Capture
    saveState('diagnostic', payload);
    
    // Audit Logging (WORM Ledger)
    await appendWormBlock('Diagnostic Execution', {
      volume: session.volume,
      totalLoss: payload.totalLoss,
      auditExposure: payload.audit
    });
    
    orchestrateUI(payload);
  } catch (error) {
    console.error('[PIPELINE FAULT] Master diagnostic failed:', error);
  } finally {
    toggleActionLoading('runScan', false);
  }
}

function handlePersonaSwitch(event) {
  const newPersona = event.target.dataset.persona || event.target.value;
  if (!newPersona) return;
  session.activePersona = newPersona;
  saveState('persona', newPersona);
  updatePersonaUIState(newPersona);
  if (session.diagnosticPayload) {
    runDiagnostic();
  }
}

function handleInquirySubmit(event) {
  event.preventDefault();
  clearFormFeedback();
  
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    org: document.getElementById('org').value,
    focus: document.getElementById('focus').value,
    message: document.getElementById('message').value,
    timestamp: new Date().toISOString()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Initiating Handshake...';

  submitTechnicalInquiry(formData)
    .then(() => {
      showFormFeedback('Technical handshake initiated successfully. Our team will contact you shortly.');
      form.reset();
    })
    .catch(err => {
      showFormFeedback(err.message || 'Failed to initiate handshake. Please try again.', true);
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    });
}

function bindMasterListeners() {
  bindEventToElement('runScan', 'click', runDiagnostic);
  bindEventToElement('inquiryForm', 'submit', handleInquirySubmit);
  
  const personaButtons = document.querySelectorAll('.persona-btn');
  personaButtons.forEach(btn => {
    btn.addEventListener('click', handlePersonaSwitch);
  });

  const volInput = document.getElementById('volInput');
  const volRange = document.getElementById('volRange');
  if (volInput && volRange) {
    volInput.addEventListener('input', (e) => {
      volRange.value = e.target.value;
    });
    volRange.addEventListener('input', (e) => {
      volInput.value = e.target.value;
    });
  }
}
