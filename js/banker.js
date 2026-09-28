/**
 * banker.js
 * =========
 * Core implementation of the Banker's Algorithm.
 *
 * Exports (attached to window.Banker):
 *   - calculateNeedMatrix(allocation, maximum)     → need[][]
 *   - runSafetyAlgorithm(available, allocation, need) → { isSafe, safeSequence, steps }
 *   - requestResources(pid, request, available, allocation, need, maximum) → { granted, reason, ... }
 */

(function (global) {
  'use strict';

  const Banker = {};

  /**
   * Calculate the Need matrix.
   * Need[i][j] = Maximum[i][j] - Allocation[i][j]
   *
   * @param {number[][]} allocation - Allocation matrix  (processes × resources)
   * @param {number[][]} maximum    - Maximum matrix     (processes × resources)
   * @returns {number[][]} need matrix
   */
  Banker.calculateNeedMatrix = function (allocation, maximum) {
    const n = allocation.length;
    const m = allocation[0].length;
    const need = [];

    for (let i = 0; i < n; i++) {
      need[i] = [];
      for (let j = 0; j < m; j++) {
        need[i][j] = maximum[i][j] - allocation[i][j];
      }
    }

    return need;
  };

  /**
   * Safety Algorithm
   * Determines whether the current system state is safe and finds a safe sequence.
   *
   * @param {number[]}   available  - Available resources vector  (length m)
   * @param {number[][]} allocation - Allocation matrix           (n × m)
   * @param {number[][]} need       - Need matrix                 (n × m)
   * @returns {{ isSafe: boolean, safeSequence: number[], steps: string[] }}
   */
  Banker.runSafetyAlgorithm = function (available, allocation, need) {
    const n = allocation.length;
    const m = available.length;

    // Working copy of available vector
    const work   = available.slice();
    const finish = new Array(n).fill(false);
    const safeSequence = [];
    const steps  = [];

    steps.push(`Initial Work (Available): [${work.join(', ')}]`);

    let count = 0;

    while (count < n) {
      let found = false;

      for (let i = 0; i < n; i++) {
        if (finish[i]) continue;

        // Check if Need[i] ≤ Work
        let canAllocate = true;
        for (let j = 0; j < m; j++) {
          if (need[i][j] > work[j]) {
            canAllocate = false;
            break;
          }
        }

        if (canAllocate) {
          // Simulate process i completing and releasing resources
          steps.push(
            `P${i}: Need [${need[i].join(', ')}] ≤ Work [${work.join(', ')}] → can proceed.`
          );

          for (let j = 0; j < m; j++) {
            work[j] += allocation[i][j];
          }

          steps.push(`P${i}: finished. Work updated to [${work.join(', ')}]`);

          finish[i] = true;
          safeSequence.push(i);
          found = true;
          count++;
        }
      }

      // No process found in this pass → unsafe state
      if (!found) {
        steps.push('No eligible process found — system is in an UNSAFE state.');
        return { isSafe: false, safeSequence: [], steps };
      }
    }

    steps.push(`Safe sequence found: ${safeSequence.map(p => 'P' + p).join(' → ')}`);
    return { isSafe: true, safeSequence, steps };
  };

  /**
   * Resource Request Algorithm
   * Checks whether a resource request by a process can be granted safely.
   *
   * @param {number}     pid        - Process index making the request
   * @param {number[]}   request    - Request vector (length m)
   * @param {number[]}   available  - Available resources vector
   * @param {number[][]} allocation - Allocation matrix
   * @param {number[][]} need       - Need matrix
   * @param {number[][]} maximum    - Maximum matrix (used for validation)
   * @returns {{ granted: boolean, reason: string, newAvailable?: number[], newAllocation?: number[][], newNeed?: number[][] }}
   */
  Banker.requestResources = function (pid, request, available, allocation, need, maximum) {
    const m = available.length;

    // Step 1 — Request must not exceed declared maximum need
    for (let j = 0; j < m; j++) {
      if (request[j] > need[pid][j]) {
        return {
          granted: false,
          reason: `Request exceeds declared maximum need for P${pid}. ` +
                  `Request[${j}]=${request[j]} > Need[${j}]=${need[pid][j]}.`
        };
      }
    }

    // Step 2 — Request must not exceed currently available resources
    for (let j = 0; j < m; j++) {
      if (request[j] > available[j]) {
        return {
          granted: false,
          reason: `Resources not available right now. P${pid} must wait. ` +
                  `Request[${j}]=${request[j]} > Available[${j}]=${available[j]}.`
        };
      }
    }

    // Step 3 — Pretend to allocate and run the safety algorithm
    const newAvailable   = available.map((v, j) => v - request[j]);
    const newAllocation  = allocation.map((row, i) =>
      i === pid ? row.map((v, j) => v + request[j]) : row.slice()
    );
    const newNeed        = need.map((row, i) =>
      i === pid ? row.map((v, j) => v - request[j]) : row.slice()
    );

    const { isSafe, safeSequence, steps } = Banker.runSafetyAlgorithm(
      newAvailable, newAllocation, newNeed
    );

    if (isSafe) {
      return {
        granted: true,
        reason: `Request granted. New safe sequence: ${safeSequence.map(p => 'P' + p).join(' → ')}.`,
        newAvailable,
        newAllocation,
        newNeed,
        safeSequence,
        steps
      };
    }

    return {
      granted: false,
      reason: `Granting this request would lead to an UNSAFE state. Request denied for P${pid}.`,
      steps
    };
  };

  // Expose on global scope
  global.Banker = Banker;

})(window);
