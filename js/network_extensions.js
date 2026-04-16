/**
 * CCX Network Fidelity Extensions v1.0
 * Scoped implementation for Heatmap and Impact Model.
 * Deterministic logic strictly for demo/modeling purposes.
 */

(function() {
  // --- PART 4: HEATMAP MODULE ---
  const heatmapData = [
    { category: "housing", unmet: 0.82 },
    { category: "food", unmet: 0.55 },
    { category: "transport", unmet: 0.30 },
    { category: "care", unmet: 0.65 }
  ];

  function getHeatmapClass(val) {
    if (val > 0.75) return "ccx-red";
    if (val > 0.4) return "ccx-amber";
    return "ccx-green";
  }

  function renderHeatmap() {
    heatmapData.forEach(item => {
      const el = document.querySelector(`[data-category="${item.category}"]`);
      if (el) el.classList.add(getHeatmapClass(item.unmet));
    });
  }

  // --- PART 5: IMPACT MODEL ---
  function calculateImpact() {
    const eInput = document.getElementById("ccx-encounters");
    const nInput = document.getElementById("ccx-staff");
    const tManualInput = document.getElementById("ccx-time");
    const tStructuredInput = document.getElementById("ccx-structured-time");
    const adultInput = document.getElementById("ccx-adults");
    const childInput = document.getElementById("ccx-children");
    const warningEl = document.getElementById("ccx-calc-warning");

    if (!eInput || !nInput || !tManualInput || !tStructuredInput) return;

    const E = parseInt(eInput.value) || 0;
    const N = parseInt(nInput.value) || 0;
    const t_manual = parseInt(tManualInput.value) || 0;
    const t_structured = parseInt(tStructuredInput.value) || 0;
    const M_adult = (adultInput) ? parseInt(adultInput.value) || 0 : 1000;
    const M_child = (childInput) ? parseInt(childInput.value) || 0 : 300;

    // Validation Guard
    if (t_manual > 0 && t_structured >= t_manual) {
      if (warningEl) {
        warningEl.innerText = "WARNING: Structured workflow must be faster than manual baseline.";
        warningEl.style.display = "block";
      }
      return;
    } else {
      if (warningEl) warningEl.style.display = "none";
    }

    // DIV Zero Guard
    if (t_manual === 0 || t_structured === 0) return;

    // 1. Recovered Hours (H)
    const H = (E * N) * ((t_manual - t_structured) / 60);

    // 2. Documentation Reduction (%)
    const reduction = ((t_manual - t_structured) / t_manual) * 100;

    // 3. Workflow Efficiency Gain (%)
    // Formula: Throughput Capacity Increase = ((t_manual / t_structured) - 1) * 100
    const efficiency = ((t_manual / t_structured) - 1) * 100;

    // 4. Additional Members Served
    const additionalMembers = (H * 60) / t_structured;

    // 5. NYHER PMPM Potential (Directional)
    const PMPM_total = (M_adult * 2.00) + (M_child * 4.00);

    // Output Mapping
    const hoursEl = document.getElementById("ccx-hours");
    const redEl = document.getElementById("ccx-reduction");
    const effEl = document.getElementById("ccx-efficiency");
    const addEl = document.getElementById("ccx-additional-mems");
    const pmpmEl = document.getElementById("ccx-pmpm");

    if (hoursEl) hoursEl.innerText = "Recovered Hours: " + Math.round(H) + " hrs/month";
    if (redEl) redEl.innerText = "Documentation Reduction: " + Math.round(reduction) + "%";
    if (effEl) effEl.innerText = "Throughput Capacity Increase: +" + Math.round(efficiency) + "%";
    if (addEl) addEl.innerText = "Additional Members Supported: " + Math.round(additionalMembers) + "/month";
    if (pmpmEl) pmpmEl.innerText = "Estimated PMPM Alignment Potential: $" + PMPM_total.toLocaleString() + "/month";
  }

  function initExtensions() {
    // 1. Heatmap initialization
    renderHeatmap();

    // 2. Calculator initialization
    const inputIds = [
      "ccx-encounters", 
      "ccx-time", 
      "ccx-staff", 
      "ccx-structured-time", 
      "ccx-adults", 
      "ccx-children"
    ];
    inputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", calculateImpact);
      }
    });

    // Run initial calculation
    calculateImpact();
  }

  // Execution Guard
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExtensions);
  } else {
    initExtensions();
  }
})();
