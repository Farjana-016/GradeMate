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
     * Formula: (Target CGPA × (Completed + Remaining) - Current CGPA × Completed) / Remaining
     * @param {number} currentCGPA
     * @param {number} completedCredits
     * @param {number} targetCGPA
     * @param {number} remainingCredits
     * @param {number} [maxScalePoint=10.0]
     * @returns {{
     *   requiredSGPA: number,
     *   maxPossibleCGPA: number,
     *   status: 'achieved' | 'achievable' | 'impossible' | 'invalid',
     *   message: string
     * }}
     */
    calculateTargetSGPA(currentCGPA, completedCredits, targetCGPA, remainingCredits, maxScalePoint = 10.0) {
      const cur = Number(currentCGPA) || 0;
      const comp = Number(completedCredits) || 0;
      const tgt = Number(targetCGPA) || 0;
      const rem = Number(remainingCredits) || 0;

      if (rem <= 0 || comp < 0 || tgt <= 0) {
        return {
          requiredSGPA: 0,
          maxPossibleCGPA: 0,
          status: 'invalid',
          message: 'Please provide valid positive credit and grade values.'
        };
      }

      const totalCredits = comp + rem;
      const requiredSGPA = (tgt * totalCredits - cur * comp) / rem;
      const maxPossibleCGPA = (cur * comp + maxScalePoint * rem) / totalCredits;

      if (tgt <= cur) {
        return {
          requiredSGPA: Math.max(0, requiredSGPA),
          maxPossibleCGPA,
          status: 'achieved',
          message: 'Target already achieved based on current academic record.'
        };
      }

      if (requiredSGPA > maxScalePoint) {
        return {
          requiredSGPA,
          maxPossibleCGPA,
          status: 'impossible',
          message: `Target is mathematically impossible on a ${maxScalePoint}-point scale. The maximum theoretical CGPA achievable is ${this.formatPrecision(maxPossibleCGPA)}.`
        };
      }

      return {
        requiredSGPA,
        maxPossibleCGPA,
        status: 'achievable',
        message: 'Target is realistically achievable with the required semester performance.'
      };
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.Calculations = Calculations;
})(window);
