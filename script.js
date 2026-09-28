/**
 * =============================================================
 *  Banker's Algorithm Simulator — script.js
 *  Operating Systems Mini-Project
 * =============================================================
 *
 *  Sections in this file:
 *    1.  State & helpers
 *    2.  Matrix DOM builders
 *    3.  Need Matrix calculation
 *    4.  Safety Algorithm  ← core OS algorithm
 *    5.  Resource Request Algorithm
 *    6.  UI renderers (status, sequence, steps, request result)
 *    7.  Event handlers (buttons)
 *    8.  Preset examples (safe & unsafe)
 *    9.  Random example generator
 * =============================================================
 */

'use strict';

/* =============================================================
   1.  STATE
   ============================================================= */

/**
 * numP  = number of processes
 * numR  = number of resource types
 * After matrices are created, the user fills values into
 * <input> cells.  We always read live from the DOM so the
 * user can edit at any time without a separate "save" step.
 */
let numP = 0;
let numR = 0;

/* =============================================================
   2.  MATRIX DOM BUILDERS
   ============================================================= */

/**
 * Build a table with editable <input> cells for Allocation or Maximum.
 * @param {string}     tableId  – id of the <table> element
 * @param {string}     prefix   – 'alloc' | 'max'  (used in input id)
 * @param {number[][]} [values] – optional pre-fill data
 */
function buildEditableMatrix(tableId, prefix, values) {
  const tbl = document.getElementById(tableId);
  tbl.innerHTML = '';

  // Header row: Process | R0 | R1 | ...
  const thead = tbl.createTHead();
  const hr = thead.insertRow();
  addTH(hr, 'Process');
  for (let j = 0; j < numR; j++) addTH(hr, `R${j}`);

  // Body rows: P0, P1, ...
  const tbody = tbl.createTBody();
  for (let i = 0; i < numP; i++) {
    const row = tbody.insertRow();
    const th = document.createElement('td');
    th.textContent = `P${i}`;
    row.appendChild(th);

    for (let j = 0; j < numR; j++) {
      const td = row.insertCell();
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min  = '0';
      inp.className = 'matrix-input';
      inp.id  = `${prefix}-${i}-${j}`;
      inp.value = (values && values[i] && values[i][j] !== undefined)
                  ? values[i][j] : '0';
      inp.setAttribute('aria-label', `${prefix} P${i} R${j}`);
      td.appendChild(inp);
    }
  }
}

/**
 * Build the read-only Need matrix table from a 2-D array.
 * @param {number[][]} need – computed Need matrix
 */
function buildNeedMatrix(need) {
  const tbl = document.getElementById('tbl-need');
  tbl.innerHTML = '';

  const thead = tbl.createTHead();
  const hr = thead.insertRow();
  addTH(hr, 'Process');
  for (let j = 0; j < numR; j++) addTH(hr, `R${j}`);

  const tbody = tbl.createTBody();
  for (let i = 0; i < numP; i++) {
    const row = tbody.insertRow();
    const th = document.createElement('td');
    th.textContent = `P${i}`;
    row.appendChild(th);

    for (let j = 0; j < numR; j++) {
      const td = row.insertCell();
      td.textContent = need[i][j];
      td.className = 'need-cell';
      // Highlight negative Need values as errors
      if (need[i][j] < 0) {
        td.style.color = 'var(--clr-danger)';
        td.title = 'Allocation exceeds Maximum!';
      }
    }
  }
}

/**
 * Build a row of labelled inputs for Available or Request vectors.
 * @param {string}   containerId – id of wrapper div
 * @param {string}   prefix      – 'avail' | 'req'
 * @param {number[]} [values]    – optional pre-fill data
 */
function buildResourceRow(containerId, prefix, values) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  for (let j = 0; j < numR; j++) {
    const grp = document.createElement('div');
    grp.className = 'res-group';

    const lbl = document.createElement('label');
    lbl.textContent = `R${j}`;
    lbl.setAttribute('for', `${prefix}-${j}`);

    const inp = document.createElement('input');
    inp.type  = 'number';
    inp.min   = '0';
    inp.id    = `${prefix}-${j}`;
    inp.value = (values && values[j] !== undefined) ? values[j] : '0';
    inp.setAttribute('aria-label', `${prefix} R${j}`);

    grp.appendChild(lbl);
    grp.appendChild(inp);
    container.appendChild(grp);
  }
}

/** Populate the process <select> in the Resource Request section. */
function buildProcessSelect() {
  const sel = document.getElementById('req-pid');
  sel.innerHTML = '';
  for (let i = 0; i < numP; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `P${i}`;
    sel.appendChild(opt);
  }
}

/** Helper: insert a <th> with text into a table row. */
function addTH(row, text) {
  const th = document.createElement('th');
  th.textContent = text;
  row.appendChild(th);
}

/* =============================================================
   3.  READ VALUES FROM DOM
   ============================================================= */

/**
 * Read a matrix from the input cells.
 * @param {string} prefix – 'alloc' | 'max'
 * @returns {number[][]}
 */
function readMatrix(prefix) {
  const m = [];
  for (let i = 0; i < numP; i++) {
    m[i] = [];
    for (let j = 0; j < numR; j++) {
      const el = document.getElementById(`${prefix}-${i}-${j}`);
      m[i][j] = el ? parseInt(el.value, 10) || 0 : 0;
    }
  }
  return m;
}

/**
 * Read a vector from resource-row inputs.
 * @param {string} prefix – 'avail' | 'req'
 * @returns {number[]}
 */
function readVector(prefix) {
  const v = [];
  for (let j = 0; j < numR; j++) {
    const el = document.getElementById(`${prefix}-${j}`);
    v[j] = el ? parseInt(el.value, 10) || 0 : 0;
  }
  return v;
}

/* =============================================================
   4.  NEED MATRIX CALCULATION
   =============================================================
   Formula:
     Need[i][j] = Maximum[i][j] - Allocation[i][j]

   This tells us how many more resources process i might
   still request in the future.
   ============================================================= */

/**
 * Compute the Need matrix.
 * @param {number[][]} allocation
 * @param {number[][]} maximum
 * @returns {number[][]} need matrix
 */
function computeNeed(allocation, maximum) {
  const need = [];
  for (let i = 0; i < numP; i++) {
    need[i] = [];
    for (let j = 0; j < numR; j++) {
      need[i][j] = maximum[i][j] - allocation[i][j];
    }
  }
  return need;
}

/* =============================================================
   5.  VALIDATION
   ============================================================= */

/**
 * Validate matrix values before running the algorithm.
 * @returns {string|null} error message string, or null if valid
 */
function validateInputs(allocation, maximum, available) {
  for (let i = 0; i < numP; i++) {
    for (let j = 0; j < numR; j++) {
      if (isNaN(allocation[i][j]) || allocation[i][j] < 0)
        return `Invalid input: Allocation[P${i}][R${j}] must be a non-negative integer.`;
      if (isNaN(maximum[i][j]) || maximum[i][j] < 0)
        return `Invalid input: Maximum[P${i}][R${j}] must be a non-negative integer.`;
      if (maximum[i][j] < allocation[i][j])
        return `Invalid input: Maximum[P${i}][R${j}] (${maximum[i][j]}) must be ≥ Allocation[P${i}][R${j}] (${allocation[i][j]}).`;
    }
  }
  for (let j = 0; j < numR; j++) {
    if (isNaN(available[j]) || available[j] < 0)
      return `Invalid input: Available[R${j}] must be a non-negative integer.`;
  }
  return null;
}

/* =============================================================
   6.  SAFETY ALGORITHM
   =============================================================
   This is the core of the Banker's Algorithm.

   Idea:
     Simulate the system finishing all processes one by one.
     A process can "finish" only if all its remaining needs
     can be satisfied by the currently available resources.
     When a process finishes it releases all its allocated
     resources back into the available pool.

   If we can finish ALL processes → SAFE state.
   If we get stuck (no process can proceed) → UNSAFE state.

   Variables:
     work[j]    – copy of available resources, updated as
                  processes finish
     finish[i]  – whether process i has been simulated as
                  finished
   ============================================================= */

/**
 * Run the Banker's Safety Algorithm.
 *
 * @param {number[]}   available
 * @param {number[][]} allocation
 * @param {number[][]} need
 * @returns {{
 *   isSafe: boolean,
 *   safeSequence: number[],
 *   steps: Array<{type,title,detail,work,process,need,canRun,newWork}>
 * }}
 */
function safetyAlgorithm(available, allocation, need) {
  // Work = copy of Available
  const work   = available.slice();
  // Finish[i] = false for every process
  const finish = new Array(numP).fill(false);
  const safeSequence = [];
  const steps = [];

  // Record the initial state
  steps.push({
    type:   'info',
    title:  'Initialisation',
    detail: `Work = Available = (${work.join(', ')})\nFinish = [${finish.map(() => 'false').join(', ')}]`
  });

  let count = 0; // how many processes have finished

  /*
   * Keep looping until all n processes are finished, or
   * one full pass finds NO eligible process (deadlock).
   */
  while (count < numP) {
    let found = false;

    for (let i = 0; i < numP; i++) {
      if (finish[i]) continue; // already finished

      // Check: Need[i] <= Work  (element-wise)
      let canRun = true;
      for (let j = 0; j < numR; j++) {
        if (need[i][j] > work[j]) {
          canRun = false;
          break;
        }
      }

      const stepEntry = {
        type:    canRun ? 'ok' : 'skip',
        title:   `Checking P${i}`,
        process: i,
        needRow: need[i].slice(),
        workSnap: work.slice(),
        canRun
      };

      if (canRun) {
        // Simulate P[i] finishing: release its allocated resources
        stepEntry.detail =
          `Need (${need[i].join(', ')}) ≤ Work (${work.join(', ')}) ✓\n` +
          `P${i} can execute.\n` +
          `P${i} finishes → releases Allocation (${allocation[i].join(', ')})`;

        for (let j = 0; j < numR; j++) {
          work[j] += allocation[i][j];
        }

        stepEntry.newWork = work.slice();
        stepEntry.detail += `\nWork becomes: (${work.join(', ')})`;

        finish[i] = true;
        safeSequence.push(i);
        found = true;
        count++;
        steps.push(stepEntry);
        break; // restart search from P0 after each success
      } else {
        stepEntry.detail =
          `Need (${need[i].join(', ')}) > Work (${work.join(', ')}) ✗\n` +
          `P${i} cannot execute yet — must wait.`;
        steps.push(stepEntry);
      }
    }

    // One complete pass with no eligible process → unsafe
    if (!found) {
      steps.push({
        type:   'fail',
        title:  'Deadlock Detected',
        detail: `No eligible process found.\nProcesses still waiting: ` +
                finish.map((f, i) => (!f ? `P${i}` : null))
                      .filter(Boolean).join(', ') +
                `\nSystem is in an UNSAFE state.`
      });
      return { isSafe: false, safeSequence: [], steps };
    }
  }

  steps.push({
    type:   'ok',
    title:  'Safe Sequence Found',
    detail: `All processes completed successfully.\n` +
            `Safe Sequence: ${safeSequence.map(p => `P${p}`).join(' → ')}`
  });

  return { isSafe: true, safeSequence, steps };
}

/* =============================================================
   7.  RESOURCE REQUEST ALGORITHM
   =============================================================
   When process Pi requests resources:

   Step 1 – Check Request[i] ≤ Need[i]
             (process cannot ask for more than it declared)

   Step 2 – Check Request[i] ≤ Available
             (resources must actually be free right now)

   Step 3 – Pretend to grant the request:
               Available   = Available   - Request[i]
               Allocation[i] = Allocation[i] + Request[i]
               Need[i]     = Need[i]     - Request[i]
             Run Safety Algorithm on this hypothetical state.
             If SAFE  → grant and commit the change.
             If UNSAFE→ roll back (don't change anything).
   ============================================================= */

/**
 * Evaluate a resource request.
 *
 * @param {number}     pid        – requesting process index
 * @param {number[]}   request    – request vector
 * @param {number[]}   available  – current Available vector
 * @param {number[][]} allocation – current Allocation matrix
 * @param {number[][]} need       – current Need matrix
 * @returns {{
 *   granted: boolean,
 *   reason: string,
 *   safeSequence?: number[],
 *   steps?: Array,
 *   newAvailable?: number[],
 *   newAllocation?: number[][],
 *   newNeed?: number[][]
 * }}
 */
function resourceRequest(pid, request, available, allocation, need) {

  // ── Check 1: Request must not exceed declared Need ──────────
  for (let j = 0; j < numR; j++) {
    if (request[j] > need[pid][j]) {
      return {
        granted: false,
        reason: `Request Denied: P${pid} requested R${j}=${request[j]} but its declared Need is only ${need[pid][j]}. ` +
                `A process cannot exceed its maximum claim.`
      };
    }
  }

  // ── Check 2: Request must not exceed Available ───────────────
  for (let j = 0; j < numR; j++) {
    if (request[j] > available[j]) {
      return {
        granted: false,
        reason: `Request cannot be granted now. P${pid} requested R${j}=${request[j]} ` +
                `but only ${available[j]} instance(s) are available. The process must wait.`
      };
    }
  }

  // ── Check 3: Hypothetical allocation → Safety check ─────────
  // Deep-copy so we do NOT touch the real matrices
  const newAvailable   = available.slice();
  const newAllocation  = allocation.map(row => row.slice());
  const newNeed        = need.map(row => row.slice());

  for (let j = 0; j < numR; j++) {
    newAvailable[j]       -= request[j];
    newAllocation[pid][j] += request[j];
    newNeed[pid][j]       -= request[j];
  }

  // Run the Safety Algorithm on the hypothetical state
  const result = safetyAlgorithm(newAvailable, newAllocation, newNeed);

  if (result.isSafe) {
    return {
      granted:       true,
      reason:        `✓ Request Granted. The system remains in a safe state.`,
      safeSequence:  result.safeSequence,
      steps:         result.steps,
      newAvailable,
      newAllocation,
      newNeed
    };
  }

  // Unsafe – roll back (newAvailable/newAllocation/newNeed are discarded)
  return {
    granted: false,
    reason:  `✗ Request Denied. Granting this request would make the system UNSAFE (deadlock risk).`,
    steps:   result.steps
  };
}

/* =============================================================
   8.  UI RENDERERS
   ============================================================= */

/** Show / hide the main simulator body. */
function showSimulator() {
  document.getElementById('simulator-body').classList.remove('hidden');
}

/** Show an error inside a target element. */
function showError(targetId, msg) {
  const el = document.getElementById(targetId);
  el.innerHTML = `<div class="error-msg">⚠️ ${escHtml(msg)}</div>`;
}

/** Render the SAFE / UNSAFE status card. */
function renderStatus(isSafe) {
  const card = document.getElementById('status-card');
  const box  = document.getElementById('status-box');
  card.style.display = '';

  if (isSafe) {
    box.innerHTML = `
      <div class="status-safe">
        <div class="status-icon-lg">✅</div>
        <div class="status-text">
          <h3>SYSTEM IS SAFE</h3>
          <p>The Banker's Algorithm found a safe sequence. No deadlock will occur.</p>
        </div>
      </div>`;
  } else {
    box.innerHTML = `
      <div class="status-unsafe">
        <div class="status-icon-lg">🚨</div>
        <div class="status-text">
          <h3>SYSTEM IS UNSAFE</h3>
          <p>No safe sequence could be found for all processes. Deadlock may occur.</p>
        </div>
      </div>`;
  }
}

/** Render the safe sequence as pills with arrows. */
function renderSafeSequence(safeSequence) {
  const seqCard = document.getElementById('safe-sequence-box');

  if (!safeSequence || safeSequence.length === 0) {
    seqCard.style.display = 'none';
    return;
  }

  seqCard.style.display = '';
  const display = document.getElementById('safe-sequence-display');
  let html = '<div class="seq-wrap">';
  safeSequence.forEach((pid, idx) => {
    html += `<span class="seq-pill">P${pid}</span>`;
    if (idx < safeSequence.length - 1) {
      html += `<span class="seq-arrow">→</span>`;
    }
  });
  html += '</div>';
  display.innerHTML = html;
}

/** Render the step-by-step algorithm execution cards. */
function renderSteps(steps, containerId) {
  const container = document.getElementById(containerId);

  if (!steps || steps.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Make the main step cards section visible when relevant
  if (containerId === 'steps-container') {
    const stepsCard = document.getElementById('steps-card');
    if (stepsCard) stepsCard.style.display = '';
  }

  let stepNum = 0;
  let html = '<div class="steps-wrapper">';

  steps.forEach(step => {
    stepNum++;
    const cls  = `step-${step.type}`;
    const detail = step.detail
      .replace(/✓/g, '<span class="ok">✓</span>')
      .replace(/✗/g, '<span class="fail">✗</span>')
      .replace(/(SAFE|safe sequence found)/gi, '<span class="ok">$1</span>')
      .replace(/(UNSAFE|deadlock)/gi,          '<span class="fail">$1</span>')
      .replace(/(Work becomes:.*)/g,           '<span class="info">$1</span>');

    html += `
      <div class="step-card ${cls}" data-step="Step ${stepNum}">
        <div class="step-title">${escHtml(step.title)}</div>
        <div class="step-detail">${detail}</div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

/** Render the resource request result. */
function renderRequestResult(result) {
  const resDiv   = document.getElementById('req-result');
  const stepsDiv = document.getElementById('req-steps');

  if (result.granted) {
    resDiv.innerHTML = `
      <div class="req-granted">
        <div class="req-icon">✅</div>
        <div class="req-text">
          <strong>REQUEST GRANTED</strong>
          ${escHtml(result.reason)}
          ${result.safeSequence
            ? `<br/>New Safe Sequence: ${result.safeSequence.map(p => 'P' + p).join(' → ')}`
            : ''}
        </div>
      </div>`;
  } else {
    resDiv.innerHTML = `
      <div class="req-denied">
        <div class="req-icon">❌</div>
        <div class="req-text">
          <strong>REQUEST DENIED</strong>
          ${escHtml(result.reason)}
        </div>
      </div>`;
  }

  // Show steps if available
  if (result.steps && result.steps.length > 0) {
    // Build a child container so renderSteps can target it without
    // wiping the heading we inject first.
    stepsDiv.innerHTML =
      '<h3 class="sub-heading" style="margin-bottom:.5rem">' +
      'Safety Check Steps (after hypothetical allocation)</h3>' +
      '<div id="_req_steps_inner"></div>';
    renderSteps(result.steps, '_req_steps_inner');
  } else {
    stepsDiv.innerHTML = '';
  }
}

/** Tiny HTML-escape helper to prevent XSS from user inputs. */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* =============================================================
   9.  CORE FLOW — called by "Check Safe State"
   ============================================================= */

function runSafetyCheck() {
  const allocation = readMatrix('alloc');
  const maximum    = readMatrix('max');
  const available  = readVector('avail');

  // Validate
  const err = validateInputs(allocation, maximum, available);
  if (err) {
    showError('status-box', err);
    document.getElementById('status-card').style.display = '';
    document.getElementById('safe-sequence-box').style.display = 'none';
    document.getElementById('steps-card').style.display = 'none';
    return;
  }

  // Calculate and render Need matrix
  const need = computeNeed(allocation, maximum);
  buildNeedMatrix(need);

  // Run the Safety Algorithm
  const result = safetyAlgorithm(available, allocation, need);

  // Render results
  renderStatus(result.isSafe);
  renderSafeSequence(result.safeSequence);
  renderSteps(result.steps, 'steps-container');

  // Scroll to status
  document.getElementById('status-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =============================================================
   10.  INITIALIZE / CREATE MATRICES
   ============================================================= */

/**
 * Read config values, validate dimensions, build all tables.
 * @param {Object} [preset] – optional pre-fill data
 *   { allocation, maximum, available }
 */
function initSimulator(preset) {
  const rawP = parseInt(document.getElementById('num-processes').value, 10);
  const rawR = parseInt(document.getElementById('num-resources').value, 10);

  if (isNaN(rawP) || rawP < 1 || rawP > 10) {
    alert('Number of processes must be between 1 and 10.');
    return;
  }
  if (isNaN(rawR) || rawR < 1 || rawR > 6) {
    alert('Number of resource types must be between 1 and 6.');
    return;
  }

  numP = rawP;
  numR = rawR;

  // Build editable matrices
  buildEditableMatrix('tbl-allocation', 'alloc', preset ? preset.allocation : null);
  buildEditableMatrix('tbl-maximum',    'max',   preset ? preset.maximum    : null);

  // Build Available row
  buildResourceRow('available-inputs', 'avail', preset ? preset.available : null);

  // Build Request row
  buildResourceRow('req-inputs', 'req', null);

  // Build process selector for requests
  buildProcessSelect();

  // Clear Need matrix and results
  document.getElementById('tbl-need').innerHTML = '';
  document.getElementById('status-card').style.display = 'none';
  document.getElementById('steps-card').style.display  = 'none';
  document.getElementById('req-result').innerHTML = '';
  document.getElementById('req-steps').innerHTML  = '';

  // Show the simulator body
  showSimulator();

  // If preset was loaded, immediately compute and show the Need matrix
  if (preset) {
    const need = computeNeed(preset.allocation, preset.maximum);
    buildNeedMatrix(need);
  }
}

/* =============================================================
   11.  RESET
   ============================================================= */

function resetSimulator() {
  // Re-build with zeros, same dimensions
  buildEditableMatrix('tbl-allocation', 'alloc', null);
  buildEditableMatrix('tbl-maximum',    'max',   null);
  buildResourceRow('available-inputs', 'avail', null);
  buildResourceRow('req-inputs', 'req', null);

  document.getElementById('tbl-need').innerHTML = '';
  document.getElementById('status-card').style.display = 'none';
  document.getElementById('steps-card').style.display  = 'none';
  document.getElementById('req-result').innerHTML = '';
  document.getElementById('req-steps').innerHTML  = '';
}

/* =============================================================
   12.  PRESET EXAMPLES
   ============================================================= */

/**
 * Classic safe example from OS textbooks.
 * Processes = 5, Resources = 3 (A, B, C)
 *
 * Allocation:        Maximum:          Available:
 *   0 1 0              7 5 3             3 3 2
 *   2 0 0              3 2 2
 *   3 0 2              9 0 2
 *   2 1 1              2 2 2
 *   0 0 2              4 3 3
 *
 * Expected safe sequence: P1 → P3 → P4 → P0 → P2
 */
function loadSafeExample() {
  document.getElementById('num-processes').value = 5;
  document.getElementById('num-resources').value = 3;

  initSimulator({
    allocation: [
      [0, 1, 0],
      [2, 0, 0],
      [3, 0, 2],
      [2, 1, 1],
      [0, 0, 2]
    ],
    maximum: [
      [7, 5, 3],
      [3, 2, 2],
      [9, 0, 2],
      [2, 2, 2],
      [4, 3, 3]
    ],
    available: [3, 3, 2]
  });
}

/**
 * Unsafe example:
 * Processes = 4, Resources = 3
 * All processes need more resources than are available,
 * and no process can proceed with the current available pool.
 */
function loadUnsafeExample() {
  document.getElementById('num-processes').value = 4;
  document.getElementById('num-resources').value = 3;

  initSimulator({
    allocation: [
      [1, 0, 2],
      [1, 1, 0],
      [1, 0, 1],
      [1, 1, 1]
    ],
    maximum: [
      [3, 3, 3],
      [2, 2, 2],
      [3, 1, 3],
      [2, 2, 2]
    ],
    available: [0, 0, 0]  // zero available → nothing can proceed
  });
}

/* =============================================================
   13.  RANDOM EXAMPLE GENERATOR
   ============================================================= */

/**
 * Generate a random valid dataset.
 * - Randomly picks 3–6 processes, 2–4 resource types.
 * - Allocation values are random [0, maxAlloc].
 * - Maximum values are always ≥ Allocation.
 * - Available is randomised independently.
 */
function generateRandomExample() {
  const p = randInt(3, 6);
  const r = randInt(2, 4);

  document.getElementById('num-processes').value = p;
  document.getElementById('num-resources').value = r;

  const allocation = [];
  const maximum    = [];

  for (let i = 0; i < p; i++) {
    allocation[i] = [];
    maximum[i]    = [];
    for (let j = 0; j < r; j++) {
      const alloc = randInt(0, 4);
      const maxVal = alloc + randInt(0, 5); // max ≥ alloc
      allocation[i][j] = alloc;
      maximum[i][j]    = maxVal;
    }
  }

  const available = [];
  for (let j = 0; j < r; j++) {
    available[j] = randInt(0, 5);
  }

  initSimulator({ allocation, maximum, available });
}

/** Inclusive random integer between lo and hi. */
function randInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/* =============================================================
   14.  EVENT WIRING
   ============================================================= */

document.addEventListener('DOMContentLoaded', function () {

  // ── Configuration buttons ──
  document.getElementById('btn-create').addEventListener('click', function () {
    initSimulator(null);
  });

  document.getElementById('btn-random').addEventListener('click', generateRandomExample);
  document.getElementById('btn-load-safe').addEventListener('click', loadSafeExample);
  document.getElementById('btn-load-unsafe').addEventListener('click', loadUnsafeExample);

  // ── Check Safe State ──
  document.getElementById('btn-check').addEventListener('click', runSafetyCheck);

  // ── Reset ──
  document.getElementById('btn-reset').addEventListener('click', resetSimulator);

  // ── Resource Request ──
  document.getElementById('btn-req-check').addEventListener('click', function () {
    const pid      = parseInt(document.getElementById('req-pid').value, 10);
    const request  = readVector('req');
    const allocation = readMatrix('alloc');
    const maximum    = readMatrix('max');
    const available  = readVector('avail');

    // Validate base state first
    const err = validateInputs(allocation, maximum, available);
    if (err) {
      showError('req-result', err);
      document.getElementById('req-steps').innerHTML = '';
      return;
    }

    // Validate request vector
    for (let j = 0; j < numR; j++) {
      if (isNaN(request[j]) || request[j] < 0) {
        showError('req-result', `Request[R${j}] must be a non-negative integer.`);
        return;
      }
    }

    const need   = computeNeed(allocation, maximum);
    const result = resourceRequest(pid, request, available, allocation, need);

    renderRequestResult(result);

    // Scroll to result
    document.getElementById('req-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ── Auto-update Need matrix whenever any allocation or maximum input changes ──
  document.addEventListener('change', function (e) {
    const el = e.target;
    if (el.classList.contains('matrix-input') && numP > 0 && numR > 0) {
      const allocation = readMatrix('alloc');
      const maximum    = readMatrix('max');
      // Only rebuild Need if no validation issues
      let hasError = false;
      for (let i = 0; i < numP; i++) {
        for (let j = 0; j < numR; j++) {
          if (maximum[i][j] < allocation[i][j]) { hasError = true; break; }
        }
        if (hasError) break;
      }
      if (!hasError) {
        const need = computeNeed(allocation, maximum);
        buildNeedMatrix(need);
      }
    }
  });

});
