/**
 * GradeMate — Core Mathematical Calculation Engine
 * Pure mathematical functions for SGPA, CGPA, and Target Planning
 * Phase 1: Project Foundation & Calculation Scaffolding
 */

(function (global) {
  'use strict';

  const Calculations = {
    /**
     * Format a floating-point number to specified decimal precision
     * without rounding intermediate values.
     * @param {number} value
     * @param {number} [precision=2]
     * @returns {string}
     */
    formatPrecision(value, precision = 2) {
      if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        return '—';
      }
      return value.toFixed(precision);
    },

    /**
     * Compute SGPA: Sum of (Subject Credits × Grade Points) / Total Credits
     * @param {Array<{credits: number, points: number}>} subjects
     * @returns {{ sgpa: number, totalCredits: number, totalPoints: number }}
     */
    calculateSGPA(subjects) {
      if (!Array.isArray(subjects) || subjects.length === 0) {
        return { sgpa: 0, totalCredits: 0, totalPoints: 0 };
      }

      let totalCredits = 0;
      let totalPoints = 0;

      for (const sub of subjects) {
        const cred = Number(sub.credits) || 0;
        const pts = Number(sub.points) || 0;
        if (cred > 0) {
          totalCredits += cred;
          totalPoints += cred * pts;
        }
      }

      const sgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
      return { sgpa, totalCredits, totalPoints };
    },

    /**
     * Compute Credit-Weighted CGPA: Sum of (Semester SGPA × Semester Credits) / Total Credits
     * @param {Array<{sgpa: number, credits: number}>} semesters
     * @returns {{ cgpa: number, totalCredits: number, semesterCount: number }}
     */
    calculateCGPA(semesters) {
      if (!Array.isArray(semesters) || semesters.length === 0) {
        return { cgpa: 0, totalCredits: 0, semesterCount: 0 };
      }

      let totalCredits = 0;
      let weightedTotal = 0;
      let validCount = 0;

      for (const sem of semesters) {
        const cred = Number(sem.credits) || 0;
        const sgpa = Number(sem.sgpa) || 0;
        if (cred > 0) {
          totalCredits += cred;
          weightedTotal += sgpa * cred;
          validCount++;
        }
      }

      const cgpa = totalCredits > 0 ? weightedTotal / totalCredits : 0;
      return { cgpa, totalCredits, semesterCount: validCount, totalPoints: weightedTotal };
    },

    /**
     * Calculate Required Average SGPA to achieve Target CGPA
     * Formula: [Target CGPA × (Completed + Remaining) - Current CGPA × Completed] / Remaining
     * @param {number} currentCGPA
     * @param {number} completedCredits
     * @param {number} targetCGPA
     * @param {number} remainingCredits
     * @param {number} [maxScalePoint=10.0]
     * @returns {{
     *   requiredSGPA: number,
     *   maxPossibleCGPA: number,
     *   totalCredits: number,
     *   status: 'achieved' | 'achievable' | 'impossible' | 'invalid',
     *   message: string
     * }}
     */
    calculateTargetSGPA(currentCGPA, completedCredits, targetCGPA, remainingCredits, maxScalePoint = 10.0) {
      const cur = Number(currentCGPA);
      const comp = Number(completedCredits);
      const tgt = Number(targetCGPA);
      const rem = Number(remainingCredits);
      const maxScale = Number(maxScalePoint) || 10.0;

      // Validate finite numbers
      if (!Number.isFinite(cur) || !Number.isFinite(comp) || !Number.isFinite(tgt) || !Number.isFinite(rem)) {
        return {
          requiredSGPA: 0,
          maxPossibleCGPA: 0,
          totalCredits: 0,
          status: 'invalid',
          message: 'All inputs must be valid finite numbers.'
        };
      }

      // Check credit and grade bounds (prevent division by zero and negative inputs)
      if (rem <= 0 || comp < 0 || tgt <= 0 || cur < 0 || tgt > maxScale) {
        return {
          requiredSGPA: 0,
          maxPossibleCGPA: 0,
          totalCredits: 0,
          status: 'invalid',
          message: 'Please provide valid positive credit and grade values within the configured scale.'
        };
      }

      // Check inconsistent freshman combination: Current CGPA > 0 with Completed Credits == 0
      if (cur > 0 && comp === 0) {
        return {
          requiredSGPA: 0,
          maxPossibleCGPA: 0,
          totalCredits: 0,
          status: 'invalid',
          message: 'Inconsistent input: Current CGPA cannot be greater than 0 if Completed Credits is 0. Please enter your completed credits, or set Current CGPA to 0.00 if starting semester 1.'
        };
      }

      const totalCredits = comp + rem;
      // Original mathematical formula
      const requiredSGPA = (tgt * totalCredits - cur * comp) / rem;
      // Theoretical maximum CGPA achievable by scoring maxScalePoint in all remaining credits
      const maxPossibleCGPA = (cur * comp + maxScale * rem) / totalCredits;

      // 1. Already Achieved: current standing already meets or exceeds target
      if (comp > 0 && cur >= tgt) {
        return {
          requiredSGPA, // Exact mathematical formula output
          maxPossibleCGPA,
          totalCredits,
          status: 'achieved',
          message: `Your current CGPA (${this.formatPrecision(cur, 2)}) already meets or exceeds your graduation target of ${this.formatPrecision(tgt, 2)}.`
        };
      }

      // 2. Impossible: required SGPA exceeds maximum scale point
      if (requiredSGPA > maxScale) {
        return {
          requiredSGPA,
          maxPossibleCGPA,
          totalCredits,
          status: 'impossible',
          message: `Target is mathematically impossible on a ${maxScale.toFixed(1)}-point scale. The maximum theoretical CGPA achievable is ${this.formatPrecision(maxPossibleCGPA, 2)}.`
        };
      }

      // 3. Achievable: required SGPA falls within the scale
      return {
        requiredSGPA,
        maxPossibleCGPA,
        totalCredits,
        status: 'achievable',
        message: 'Target is realistically achievable with the required semester performance.'
      };
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.Calculations = Calculations;
})(window);
