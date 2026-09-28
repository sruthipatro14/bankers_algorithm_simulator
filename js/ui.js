/**
 * ui.js
 * =====
 * Handles all DOM rendering and display logic.
 *
 * Responsibilities:
 *   - Render editable Allocation and Maximum matrices
 *   - Render read-only Need matrix and Available vector
 *   - Display safe/unsafe status banner
 *   - Display safe sequence as pill badges
 *   - Display step-by-step algorithm execution log
 *   - Display resource request results
 *
 * Exposes API on window.UI.
 */

(function (global) {
  'use strict';

  const UI = {};

  /* ------------------------------------------------------------------ */
  /*  Matrix Rendering                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Render an editable matrix table inside a container element.
   * Each cell becomes an <input type="number">.
   *
   * @param {string}     containerId - DOM id of the wrapper element
   * @param {number[][]} data        - 2D array of values
   * @param {string}     matrixType  - 'allocation' | 'maximum' (used as data-type)
   * @param {number}     numResources
   */
  UI.renderEditableMatrix = function (containerId, data, matrixType, numResources) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const n = data.length;
    const m = numResources;

    let html = '<div class="table-wrapper"><table><thead><tr><th>Process</th>';
    for (let j = 0; j < m; j++) {
      html += `<th>R${j}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < n; i++) {
      html += `<tr><td><strong>P${i}</strong></td>`;
      for (let j = 0; j < m; j++) {
        html += `<td>
          <input
            type="number"
            min="0"
            value="${data[i][j]}"
            data-matrix="${matrixType}"
            data-row="${i}"
            data-col="${j}"
            aria-label="${matrixType} P${i} R${j}"
          />
        </td>`;
      }
      html += '</tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
  };

  /**
   * Render a read-only matrix table.
   *
   * @param {string}     containerId
   * @param {number[][]} data
   * @param {number}     numResources
   */
  UI.renderReadOnlyMatrix = function (containerId, data, numResources) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const n = data.length;
    const m = numResources;

    let html = '<div class="table-wrapper"><table><thead><tr><th>Process</th>';
    for (let j = 0; j < m; j++) {
      html += `<th>R${j}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < n; i++) {
      html += `<tr><td><strong>P${i}</strong></td>`;
      for (let j = 0; j < m; j++) {
        html += `<td>${data[i][j]}</td>`;
      }
      html += '</tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
  };

  /**
   * Render the Available resources row.
   *
   * @param {string}   containerId
   * @param {number[]} available
   */
  UI.renderAvailable = function (containerId, available) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const m = available.length;
    let html = '<div class="table-wrapper"><table><thead><tr>';
    for (let j = 0; j < m; j++) {
      html += `<th>R${j}</th>`;
    }
    html += '</tr></thead><tbody><tr>';
    for (let j = 0; j < m; j++) {
      html += `<td>
        <input
          type="number"
          min="0"
          value="${available[j]}"
          data-matrix="available"
          data-row="0"
          data-col="${j}"
          aria-label="Available R${j}"
        />
      </td>`;
    }
    html += '</tr></tbody></table></div>';
    container.innerHTML = html;
  };

  /* ------------------------------------------------------------------ */
  /*  Status Banner                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Show the safe/unsafe status banner.
   *
   * @param {string}  containerId
   * @param {boolean} isSafe
   */
  UI.renderStatus = function (containerId, isSafe) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.className = 'status-banner ' + (isSafe ? 'safe' : 'unsafe');
    container.innerHTML = isSafe
      ? '<span class="status-icon">✅</span><span>System is in a <strong>SAFE</strong> state.</span>'
      : '<span class="status-icon">🚨</span><span>System is in an <strong>UNSAFE</strong> state. Deadlock may occur.</span>';
  };

  UI.clearStatus = function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.className = 'status-banner';
    container.innerHTML = '';
  };

  /* ------------------------------------------------------------------ */
  /*  Safe Sequence                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Render the safe sequence as pill badges with arrows.
   *
   * @param {string}   containerId
   * @param {number[]} sequence - Array of process indices
   */
  UI.renderSafeSequence = function (containerId, sequence) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!sequence || sequence.length === 0) {
      container.innerHTML = '<p style="color:var(--color-text-muted)">No safe sequence available.</p>';
      return;
    }

    let html = '<div class="sequence-container">';
    sequence.forEach((pid, idx) => {
      html += `<span class="sequence-step">P${pid}</span>`;
      if (idx < sequence.length - 1) {
        html += '<span class="sequence-arrow">→</span>';
      }
    });
    html += '</div>';
    container.innerHTML = html;
  };

  /* ------------------------------------------------------------------ */
  /*  Step-by-Step Log                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Render the algorithm execution steps into a scrollable log.
   *
   * @param {string}   containerId
   * @param {string[]} steps - Array of step description strings
   */
  UI.renderSteps = function (containerId, steps) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!steps || steps.length === 0) {
      container.innerHTML = '<p class="step-info">No steps to display.</p>';
      return;
    }

    let html = '';
    steps.forEach(step => {
      let cls = 'step-info';
      if (step.toLowerCase().includes('unsafe') || step.toLowerCase().includes('denied')) {
        cls = 'step-fail';
      } else if (step.toLowerCase().includes('finished') || step.toLowerCase().includes('safe sequence found') || step.toLowerCase().includes('granted')) {
        cls = 'step-ok';
      }
      html += `<div class="step-entry ${cls}">${_escapeHtml(step)}</div>`;
    });

    container.innerHTML = html;
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  };

  /* ------------------------------------------------------------------ */
  /*  Resource Request Result                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Display the result of a resource request.
   *
   * @param {string}  containerId
   * @param {boolean} granted
   * @param {string}  reason
   */
  UI.renderRequestResult = function (containerId, granted, reason) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.className = 'request-result ' + (granted ? 'granted' : 'denied');
    const icon = granted ? '✅' : '❌';
    container.innerHTML = `${icon} ${_escapeHtml(reason)}`;
  };

  UI.clearRequestResult = function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.className = 'request-result';
    container.innerHTML = '';
  };

  /* ------------------------------------------------------------------ */
  /*  Error / Toast Messages                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Show a temporary error message inside a container.
   *
   * @param {string} containerId
   * @param {string} message
   */
  UI.showError = function (containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<p style="color:var(--color-danger);font-weight:600;">${_escapeHtml(message)}</p>`;
  };

  UI.clearElement = function (containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
  };

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                      */
  /* ------------------------------------------------------------------ */

  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Expose on global scope
  global.UI = UI;

})(window);
