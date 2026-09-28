/**
 * main.js
 * =======
 * Application entry point.
 *
 * Responsibilities:
 *   - Initialize the simulator when the page loads
 *   - Wire up all button click handlers
 *   - Coordinate between Matrix, Banker, and UI modules
 *   - Handle user-driven events (generate matrices, run algorithm, request resources)
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Initialization                                                       */
  /* ------------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', function () {
    // Set default values in the config inputs
    document.getElementById('num-processes').value = 5;
    document.getElementById('num-resources').value = 3;

    // Wire up buttons
    document.getElementById('btn-generate').addEventListener('click', handleGenerate);
    document.getElementById('btn-run-safety').addEventListener('click', handleRunSafety);
    document.getElementById('btn-request').addEventListener('click', handleResourceRequest);
    document.getElementById('btn-reset').addEventListener('click', handleReset);

    // Listen for matrix cell changes (event delegation)
    document.addEventListener('change', handleMatrixInput);
  });

  /* ------------------------------------------------------------------ */
  /*  Event Handlers                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Generate editable matrix tables based on the chosen dimensions.
   */
  function handleGenerate() {
    const n = parseInt(document.getElementById('num-processes').value, 10);
    const m = parseInt(document.getElementById('num-resources').value, 10);

    if (!_validateDimensions(n, m)) return;

    // Initialize all matrices with zeros
    Matrix.init(n, m);

    // Render editable tables
    UI.renderEditableMatrix('allocation-table', Matrix.getAllocation(), 'allocation', m);
    UI.renderEditableMatrix('maximum-table',    Matrix.getMaximum(),    'maximum',    m);
    UI.renderAvailable('available-table', Matrix.getAvailable());

    // Clear derived / results
    UI.clearElement('need-table');
    UI.clearStatus('status-banner');
    UI.clearElement('safe-sequence');
    UI.clearElement('steps-log');
    UI.clearRequestResult('request-result');

    // Show the sections that were hidden
    _showSection('matrices-section');
    _showSection('results-section');
    _showSection('request-section');

    // Populate process selector in resource request form
    _populateProcessSelect(n);
    // Populate request input fields
    _populateRequestInputs(m);
  }

  /**
   * Read current matrix values → run Banker's Safety Algorithm → display results.
   */
  function handleRunSafety() {
    // Sync matrix state from DOM inputs
    _syncMatricesFromDOM();

    // Compute Need = Maximum - Allocation
    Matrix.computeNeed();

    // Validate
    const { valid, errors } = Matrix.validate();
    if (!valid) {
      UI.showError('status-banner', 'Validation errors: ' + errors.join(' | '));
      return;
    }

    const available  = Matrix.getAvailable();
    const allocation = Matrix.getAllocation();
    const need       = Matrix.getNeed();

    // Render read-only Need matrix
    UI.renderReadOnlyMatrix('need-table', need, Matrix.getNumResources());

    // Run safety algorithm
    const result = Banker.runSafetyAlgorithm(available, allocation, need);

    // Display results
    UI.renderStatus('status-banner', result.isSafe);
    UI.renderSafeSequence('safe-sequence', result.safeSequence);
    UI.renderSteps('steps-log', result.steps);
  }

  /**
   * Handle a resource request from the request form.
   */
  function handleResourceRequest() {
    const pid = parseInt(document.getElementById('request-pid').value, 10);
    const m   = Matrix.getNumResources();

    if (isNaN(pid) || pid < 0 || pid >= Matrix.getNumProcesses()) {
      UI.renderRequestResult('request-result', false, 'Invalid process selected.');
      return;
    }

    const request = [];
    for (let j = 0; j < m; j++) {
      const val = parseInt(document.getElementById(`request-r${j}`).value, 10);
      request.push(isNaN(val) ? 0 : val);
    }

    // Make sure matrices are up-to-date
    _syncMatricesFromDOM();
    Matrix.computeNeed();

    const available  = Matrix.getAvailable();
    const allocation = Matrix.getAllocation();
    const need       = Matrix.getNeed();
    const maximum    = Matrix.getMaximum();

    const result = Banker.requestResources(pid, request, available, allocation, need, maximum);

    UI.renderRequestResult('request-result', result.granted, result.reason);

    // If granted, update the live matrices with new state
    if (result.granted) {
      Matrix.loadAvailable(result.newAvailable);
      Matrix.loadAllocation(result.newAllocation);
      Matrix.loadMaximum(maximum);       // maximum unchanged
      Matrix.computeNeed();

      // Re-render matrices to reflect new allocations
      UI.renderEditableMatrix('allocation-table', Matrix.getAllocation(), 'allocation', m);
      UI.renderAvailable('available-table', Matrix.getAvailable());
      UI.renderReadOnlyMatrix('need-table', Matrix.getNeed(), m);

      // Also update the step log and sequence for the post-request state
      if (result.steps)        UI.renderSteps('steps-log', result.steps);
      if (result.safeSequence) UI.renderSafeSequence('safe-sequence', result.safeSequence);
    }

    if (result.steps && !result.granted) {
      UI.renderSteps('steps-log', result.steps);
    }
  }

  /**
   * Reset the entire simulator back to its initial state.
   */
  function handleReset() {
    document.getElementById('num-processes').value = 5;
    document.getElementById('num-resources').value = 3;

    UI.clearElement('allocation-table');
    UI.clearElement('maximum-table');
    UI.clearElement('available-table');
    UI.clearElement('need-table');
    UI.clearStatus('status-banner');
    UI.clearElement('safe-sequence');
    UI.clearElement('steps-log');
    UI.clearRequestResult('request-result');
    UI.clearElement('request-inputs');

    _hideSection('matrices-section');
    _hideSection('results-section');
    _hideSection('request-section');
  }

  /**
   * Event delegation handler for matrix cell <input> changes.
   */
  function handleMatrixInput(event) {
    const el = event.target;
    if (!el.dataset.matrix) return;

    const row = parseInt(el.dataset.row, 10);
    const col = parseInt(el.dataset.col, 10);
    const val = parseInt(el.value, 10);

    switch (el.dataset.matrix) {
      case 'allocation':
        Matrix.setAllocation(row, col, val);
        break;
      case 'maximum':
        Matrix.setMaximum(row, col, val);
        break;
      case 'available':
        Matrix.setAvailable(col, val);
        break;
      default:
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Read all visible matrix inputs and update the Matrix module.
   */
  function _syncMatricesFromDOM() {
    document.querySelectorAll('input[data-matrix]').forEach(function (el) {
      const row = parseInt(el.dataset.row, 10);
      const col = parseInt(el.dataset.col, 10);
      const val = parseInt(el.value,       10);

      switch (el.dataset.matrix) {
        case 'allocation': Matrix.setAllocation(row, col, val); break;
        case 'maximum':    Matrix.setMaximum(row, col, val);    break;
        case 'available':  Matrix.setAvailable(col, val);        break;
        default: break;
      }
    });
  }

  function _validateDimensions(n, m) {
    if (isNaN(n) || n < 1 || n > 20) {
      alert('Number of processes must be between 1 and 20.');
      return false;
    }
    if (isNaN(m) || m < 1 || m > 10) {
      alert('Number of resources must be between 1 and 10.');
      return false;
    }
    return true;
  }

  function _populateProcessSelect(n) {
    const select = document.getElementById('request-pid');
    if (!select) return;
    select.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `P${i}`;
      select.appendChild(opt);
    }
  }

  function _populateRequestInputs(m) {
    const container = document.getElementById('request-inputs');
    if (!container) return;
    let html = '';
    for (let j = 0; j < m; j++) {
      html += `
        <div class="form-group">
          <label for="request-r${j}">R${j}</label>
          <input type="number" id="request-r${j}" min="0" value="0" aria-label="Request R${j}" />
        </div>`;
    }
    container.innerHTML = html;
  }

  function _showSection(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  }

  function _hideSection(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

})();
