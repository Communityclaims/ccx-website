/**
 * CCXNY Cryptographic Ledger Controller (audit.js)
 * ARCHITECTURAL DIRECTIVE: WORM (Write Once, Read Many) integrity logic.
 */

import { saveState, loadState, sha256Hex } from './utils.js';
import { renderWormChain, renderAuditResults, updateLogicVerifiedStatus } from './ui.js';
import { computeCustomAuditExposure } from './engine.js'; 

export let wormChain = [];

export async function loadOrInitializeLedger() {
  const savedLedger = loadState('worm_ledger');
  if (Array.isArray(savedLedger) && savedLedger.length > 0) {
    wormChain = savedLedger;
  } else {
    const genesisBlock = {
      action: 'System Boot: Genesis WORM Initialization',
      data: { status: '1115 Waiver Audit Mode Active' },
      timestamp: Date.now(),
      previousHash: '0'.repeat(64),
      hash: '0'.repeat(64), 
      status: 'VERIFIED'
    };
    wormChain = [genesisBlock];
    saveState('worm_ledger', wormChain);
  }
  
  if (document.getElementById('worm-chain-output')) {
    renderWormChain('worm-chain-output', wormChain);
  }
  if (document.getElementById('ledger')) {
    renderWormChain('ledger', wormChain);
  }
}

export async function runAudit() {
  const vol = Number(document.getElementById('volume')?.value) || 0;
  const prob = Number(document.getElementById('auditProb')?.value) || 0;
  const fail = Number(document.getElementById('failureRate')?.value) || 0;
  const mult = Number(document.getElementById('multiplier')?.value) || 1;

  const results = computeCustomAuditExposure(vol, fail, prob, mult);
  renderAuditResults(results);

  await appendWormBlock('Deterministic Audit Execution', {
    inputs: { vol, prob, fail, mult },
    outputs: results
  });
}

export async function appendWormBlock(action, data) {
  const previousBlock = wormChain[wormChain.length - 1];
  const previousHash = previousBlock ? previousBlock.hash : '0'.repeat(64);
  const timestamp = Date.now();
  
  const payloadString = JSON.stringify({ action, data, timestamp, previousHash });
  const hash = await sha256Hex(payloadString);

  const newBlock = { action, data, timestamp, previousHash, hash, status: 'VERIFIED' };
  wormChain.push(newBlock);
  saveState('worm_ledger', wormChain);
  
  if (document.getElementById('worm-chain-output')) {
    renderWormChain('worm-chain-output', wormChain);
  }
  if (document.getElementById('ledger')) {
    renderWormChain('ledger', wormChain);
  }
}

export function bindAuditListeners() {
  document.getElementById('runAudit')?.addEventListener('click', runAudit);
  document.getElementById('simulateTamper')?.addEventListener('click', () => {
    if (wormChain.length > 1) {
      wormChain[wormChain.length - 1].data = { TAMPERED: true };
      saveState('worm_ledger', wormChain);
      if (document.getElementById('worm-chain-output')) renderWormChain('worm-chain-output', wormChain);
      if (document.getElementById('ledger')) renderWormChain('ledger', wormChain);
      alert('Tamper simulated. Re-verify to see failure.');
    }
  });
  document.getElementById('verifyChainBtn')?.addEventListener('click', async () => {
    let valid = true;
    for (let i = 1; i < wormChain.length; i++) {
      const block = wormChain[i];
      const prev = wormChain[i-1];
      if (block.previousHash !== prev.hash) { valid = false; break; }
      const payload = JSON.stringify({ action: block.action, data: block.data, timestamp: block.timestamp, previousHash: block.previousHash });
      const rehash = await sha256Hex(payload);
      if (rehash !== block.hash) { valid = false; break; }
    }
    
    updateLogicVerifiedStatus(valid);
    
    const statusEl = document.getElementById('integrityStatus');
    if (statusEl) {
      statusEl.textContent = valid ? 'System Integrity Verified' : 'System Integrity Compromised';
      statusEl.style.color = valid ? 'var(--ccx-status-live)' : '#EF4444';
    }
  });
}
