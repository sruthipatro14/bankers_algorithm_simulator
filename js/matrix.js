/**
 * matrix.js
 * =========
 * Creates and manages the four core data structures used by the Banker's Algorithm:
 *   - Allocation Matrix   (n × m)
 *   - Maximum Matrix      (n × m)
 *   - Need Matrix         (n × m)  — derived, read-only
 *   - Available Vector    (1 × m)
 *
 * All data is stored internally and exposed via getter/setter functions.
 * Exposes API on window.Matrix.
 */

(function (global) {
  'use strict';

  // Internal state
  let _numProcesses = 0;
  let _numResources = 0;
  let _allocation   = [];
  let _maximum      = [];
  let _need         = [];
  let _available    = [];

  const Matrix = {};

  /* ------------------------------------------------------------------ */
  /*  Initialization                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Initialize (or re-initialize) all matrices with zero values.
   * @param {number} numProcesses - Number of processes (n)
   * @param {number} numResources - Number of resources (m)
   */
  Matrix.init = function (numProcesses, numResources) {
    _numProcesses = numProcesses;
    _numResources = numResources;

    _allocation = _createMatrix(numProcesses, numResources);
    _maximum    = _createMatrix(numProcesses, numResources);
    _need       = _createMatrix(numProcesses, numResources);
    _available  = new Array(numResources).fill(0);
  };

  /* ------------------------------------------------------------------ */
  /*  Setters                                                             */
  /* ------------------------------------------------------------------ */

  Matrix.setAllocation = function (i, j, value) {
    _allocation[i][j] = _sanitize(value);
  };

  Matrix.setMaximum = function (i, j, value) {
    _maximum[i][j] = _sanitize(value);
  };

  Matrix.setAvailable = function (j, value) {
    _available[j] = _sanitize(value);
  };

  /**
   * Recompute Need matrix from current Allocation and Maximum values.
   * Must be called after any change to Allocation or Maximum.
   */
  Matrix.computeNeed = function () {
    for (let i = 0; i < _numProcesses; i++) {
      for (let j = 0; j < _numResources; j++) {
        _need[i][j] = _maximum[i][j] - _allocation[i][j];
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Getters — return deep copies to prevent external mutation           */
  /* ------------------------------------------------------------------ */

  Matrix.getAllocation = function () {
    return _deepCopy(_allocation);
  };

  Matrix.getMaximum = function () {
    return _deepCopy(_maximum);
  };

  Matrix.getNeed = function () {
    return _deepCopy(_need);
  };

  Matrix.getAvailable = function () {
    return _available.slice();
  };

  Matrix.getNumProcesses = function () {
    return _numProcesses;
  };

  Matrix.getNumResources = function () {
    return _numResources;
  };

  /* ------------------------------------------------------------------ */
  /*  Bulk load (e.g. from parsed input)                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Overwrite the entire Allocation matrix at once.
   * @param {number[][]} data
   */
  Matrix.loadAllocation = function (data) {
    _allocation = _deepCopy(data);
  };

  /**
   * Overwrite the entire Maximum matrix at once.
   * @param {number[][]} data
   */
  Matrix.loadMaximum = function (data) {
    _maximum = _deepCopy(data);
  };

  /**
   * Overwrite the Available vector at once.
   * @param {number[]} data
   */
  Matrix.loadAvailable = function (data) {
    _available = data.slice();
  };

  /* ------------------------------------------------------------------ */
  /*  Validation                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Validate that all matrix values are logically consistent.
   * @returns {{ valid: boolean, errors: string[] }}
   */
  Matrix.validate = function () {
    const errors = [];

    for (let i = 0; i < _numProcesses; i++) {
      for (let j = 0; j < _numResources; j++) {
        if (_allocation[i][j] < 0) {
          errors.push(`Allocation[P${i}][R${j}] is negative.`);
        }
        if (_maximum[i][j] < 0) {
          errors.push(`Maximum[P${i}][R${j}] is negative.`);
        }
        if (_allocation[i][j] > _maximum[i][j]) {
          errors.push(
            `Allocation[P${i}][R${j}] (${_allocation[i][j]}) exceeds Maximum[P${i}][R${j}] (${_maximum[i][j]}).`
          );
        }
      }
    }

    for (let j = 0; j < _numResources; j++) {
      if (_available[j] < 0) {
        errors.push(`Available[R${j}] is negative.`);
      }
    }

    return { valid: errors.length === 0, errors };
  };

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                      */
  /* ------------------------------------------------------------------ */

  function _createMatrix(rows, cols) {
    return Array.from({ length: rows }, () => new Array(cols).fill(0));
  }

  function _deepCopy(matrix) {
    return matrix.map(row => row.slice());
  }

  function _sanitize(value) {
    const n = parseInt(value, 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  }

  // Expose on global scope
  global.Matrix = Matrix;

})(window);
