/**
 * CCX SCN Network Fidelity Controller (network.js)
 * ARCHITECTURAL DIRECTIVE: Node-level risk surveillance logic.
 */

import { computeNetworkAverages } from './engine.js';
import { loadState } from './utils.js';
import { 
  renderNetworkSummary, 
  renderNetworkGrid, 
  renderNodeTable,
  injectGlobalFooter,
  showNoState
} from './ui.js';

export function handleNetworkHydration() {
  const priorState = loadState('diagnostic');
  
  if (!priorState) {
    showNoState('networkGrid');
    return;
  }

  injectGlobalFooter(priorState);

  const nodes = priorState.nodes;
  const avgs = computeNetworkAverages(nodes);

  renderNetworkSummary(avgs);
  renderNetworkGrid('networkGrid', nodes);
  
  const tableBody = document.getElementById('nodeTableBody');
  const tableControls = document.getElementById('table-controls');
  if (tableBody) {
    renderNodeTable(tableBody, nodes, 5);
    if (tableControls && nodes.length > 5) {
      tableControls.style.display = 'flex';
    }
  }
}

export function bindNetworkListeners(nodes) {
  let isExpanded = false;
  const toggleBtn = document.getElementById('toggleTable');
  const tableBody = document.getElementById('nodeTableBody');

  toggleBtn?.addEventListener('click', () => {
    isExpanded = !isExpanded;
    if (tableBody && nodes) {
      renderNodeTable(tableBody, nodes, isExpanded ? null : 5);
      toggleBtn.textContent = isExpanded ? 'Collapse Network Ledger' : 'Show Full Network Ledger';
    }
  });

  document.getElementById('export')?.addEventListener('click', () => {
    if (!nodes) return;
    const header = 'node_id,screening_rate,referral_completion,fidelity_score,risk_tier';
    const rows = nodes.map(n => [
      n.id,
      (n.screening * 100).toFixed(2) + '%',
      (n.referral * 100).toFixed(2) + '%',
      (n.fidelity * 100).toFixed(2) + '%',
      `"${n.tier}"`
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ccx-network-fidelity.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}
