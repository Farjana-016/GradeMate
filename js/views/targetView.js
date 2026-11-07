/**
 * GradeMate — Target CGPA Planner View Controller
 * Phase 5: Goal Solver, Feasibility Analyzer, Theoretical Ceiling & History Auto-fill
 */

(function (global) {
  'use strict';

  const TargetView = {
    initialized: false,

    // DOM References
    containerEl: null,
    scaleNameEl: null,
    btnAutofillEl: null,
    autofillBannerEl: null,
    currentCgpaInput: null,
    completedCreditsInput: null,
    desiredCgpaInput: null,
    remainingCreditsInput: null,
    btnCalculateEl: null,
    btnResetEl: null,
    validationBoxEl: null,
    validationListEl: null,
    resultPanelEl: null,
    statusBadgeEl: null,
    cardRequiredSgpaEl: null,
    labelRequiredSgpaEl: null,
    requiredSgpaValueEl: null,
    subRequiredSgpaEl: null,
    maxCgpaValueEl: null,
    totalCreditsValueEl: null,
    benchmarkValueEl: null,
    advisoryCardEl: null,
    advisoryTextEl: null,

    /**
     * Initialize Target View DOM elements and event bindings
     */
    init() {
      if (this.initialized) return;
      const { DOM, State } = global.GradeMate;

      this.containerEl = DOM.qs('#view-target');
      if (!this.containerEl) return;

      this.scaleNameEl = DOM.qs('#target-scale-name', this.containerEl);
      this.btnAutofillEl = DOM.qs('#btn-autofill-target', this.containerEl);
      this.autofillBannerEl = DOM.qs('#target-autofill-banner', this.containerEl);
      this.currentCgpaInput = DOM.qs('#target-current-cgpa', this.containerEl);
      this.completedCreditsInput = DOM.qs('#target-completed-credits', this.containerEl);
      this.desiredCgpaInput = DOM.qs('#target-desired-cgpa', this.containerEl);
      this.remainingCreditsInput = DOM.qs('#target-remaining-credits', this.containerEl);
      this.btnCalculateEl = DOM.qs('#btn-calculate-target', this.containerEl);
      this.btnResetEl = DOM.qs('#btn-reset-target', this.containerEl);
      this.validationBoxEl = DOM.qs('#target-validation-box', this.containerEl);
      this.validationListEl = DOM.qs('#target-validation-list', this.containerEl);
      this.resultPanelEl = DOM.qs('#target-result-panel', this.containerEl);
      this.statusBadgeEl = DOM.qs('#target-status-badge', this.containerEl);
      this.cardRequiredSgpaEl = DOM.qs('#card-required-sgpa', this.containerEl);
      this.labelRequiredSgpaEl = DOM.qs('#label-required-sgpa', this.containerEl);
      this.requiredSgpaValueEl = DOM.qs('#target-required-sgpa-value', this.containerEl);
      this.subRequiredSgpaEl = DOM.qs('#sub-required-sgpa', this.containerEl);
      this.maxCgpaValueEl = DOM.qs('#target-max-cgpa-value', this.containerEl);
      this.totalCreditsValueEl = DOM.qs('#target-total-credits-value', this.containerEl);
      this.benchmarkValueEl = DOM.qs('#target-benchmark-value', this.containerEl);
      this.advisoryCardEl = DOM.qs('#target-advisory-card', this.containerEl);
      this.advisoryTextEl = DOM.qs('#target-advisory-text', this.containerEl);

      // Bind Calculate Button
      if (this.btnCalculateEl) {
        DOM.on(this.btnCalculateEl, 'click', () => this.calculate());
      }

      // Bind Reset Button
      if (this.btnResetEl) {
        DOM.on(this.btnResetEl, 'click', () => this.handleReset());
      }

      // Bind Auto-fill Button
      if (this.btnAutofillEl) {
        DOM.on(this.btnAutofillEl, 'click', () => this.autoFillFromHistory());
      }

      // Invalidate results when inputs change to prevent stale display
      const inputs = [
        this.currentCgpaInput,
        this.completedCreditsInput,
        this.desiredCgpaInput,
        this.remainingCreditsInput
      ];
      inputs.forEach((input) => {
        if (input) {
          DOM.on(input, 'input', () => {
            input.classList.remove('is-invalid');
            this.clearResultPanel();
          });
          DOM.on(input, 'change', () => {
            input.classList.remove('is-invalid');
            this.clearResultPanel();
          });
        }
      });

      // Update scale indicator dynamically when preferences update
      State.on('preferences:updated', () => {
        this.updateScaleBadge();
      });

      this.initialized = true;
    },

    /**
     * View activation hook
     */
    onActivate() {
      this.init();
      this.updateScaleBadge();
    },

    /**
     * Update active scale display badge and input max constraints
     */
    updateScaleBadge() {
      const { Storage } = global.GradeMate;
      const prefs = Storage.getPreferences();
      const maxScale = prefs.maxScalePoint || 10.0;

      if (this.scaleNameEl) {
        const scaleTitle = prefs.gradingSystemId === 'scale_4_us'
          ? '4.0 US Scale'
          : `${maxScale}-Point Scale`;
        this.scaleNameEl.textContent = scaleTitle;
      }

      if (this.currentCgpaInput) {
        this.currentCgpaInput.setAttribute('max', String(maxScale));
      }
      if (this.desiredCgpaInput) {
        this.desiredCgpaInput.setAttribute('max', String(maxScale));
      }
    },

    /**
     * Auto-fill Current CGPA and Completed Credits from saved records
     * Rules:
     * - Reuse exact logic from Dashboard:
     *   1. Prefer latest saved CGPA record from grademate_cgpa_history.
     *   2. If no saved CGPA, derive from SGPA history with unique semester deduplication.
     *   3. If neither exists, provide clear feedback banner.
     */
    autoFillFromHistory() {
      const { Storage, DOM, Calculations } = global.GradeMate;
      const prefs = Storage.getPreferences();
      const precision = typeof prefs.decimalPrecision === 'number' ? prefs.decimalPrecision : 2;
      const cgpaHistory = Storage.getCGPAHistory() || [];
      const sgpaHistory = Storage.getSGPAHistory() || [];

      let derivedCgpa = null;
      let derivedCredits = null;
      let sourceDescription = '';

      // 1. Prefer latest saved CGPA record
      if (Array.isArray(cgpaHistory) && cgpaHistory.length > 0) {
        const sorted = [...cgpaHistory].sort((a, b) => {
          return new Date(b.calculatedAt || 0) - new Date(a.calculatedAt || 0);
        });
        const latest = sorted[0];
        if (latest && typeof latest.cgpa === 'number') {
          derivedCgpa = latest.cgpa;
          derivedCredits = Number(latest.totalCredits) || 0;
          sourceDescription = latest.title ? `latest CGPA record "${latest.title}"` : 'latest saved CGPA calculation';
        }
      }

      // 2. If no saved CGPA, derive from SGPA history (deduplicated unique semesters)
      if (derivedCgpa === null && Array.isArray(sgpaHistory) && sgpaHistory.length > 0) {
        const sortedHistory = [...sgpaHistory].sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.calculatedAt || 0);
          const dateB = new Date(b.updatedAt || b.calculatedAt || 0);
          return dateB - dateA;
        });

        const uniqueSemesterMap = new Map();
        sortedHistory.forEach((rec) => {
          const semName = (rec.semester || '').trim();
          const semKey = semName.toLowerCase();
          if (semKey && !uniqueSemesterMap.has(semKey)) {
            uniqueSemesterMap.set(semKey, {
              sgpa: Number(rec.sgpa) || 0,
              credits: Number(rec.totalCredits) || 0
            });
          }
        });

        const uniqueList = Array.from(uniqueSemesterMap.values());
        let totalCreds = 0;
        let weightedPoints = 0;
        uniqueList.forEach((item) => {
          if (item.credits > 0) {
            totalCreds += item.credits;
            weightedPoints += item.sgpa * item.credits;
          }
        });

        if (totalCreds > 0) {
          derivedCgpa = weightedPoints / totalCreds;
          derivedCredits = totalCreds;
          sourceDescription = `derived from ${uniqueList.length} unique saved semester ${uniqueList.length === 1 ? 'record' : 'records'}`;
        }
      }

      // Check if we found data
      if (derivedCgpa !== null && derivedCredits !== null) {
        if (this.currentCgpaInput) {
          this.currentCgpaInput.value = Calculations.formatPrecision(derivedCgpa, precision);
          this.currentCgpaInput.classList.remove('is-invalid');
        }
        if (this.completedCreditsInput) {
          this.completedCreditsInput.value = Number.isInteger(derivedCredits)
            ? derivedCredits.toString()
            : parseFloat(derivedCredits.toFixed(2)).toString();
          this.completedCreditsInput.classList.remove('is-invalid');
        }
        if (this.autofillBannerEl) {
          this.autofillBannerEl.className = 'import-banner is-info';
          this.autofillBannerEl.textContent = `Auto-filled Current CGPA (${Calculations.formatPrecision(derivedCgpa, precision)}) and Completed Credits (${derivedCredits}) from your ${sourceDescription}.`;
          DOM.toggle(this.autofillBannerEl, true);
        }
        this.clearResultPanel();
      } else {
        if (this.autofillBannerEl) {
          this.autofillBannerEl.className = 'import-banner is-warning';
          this.autofillBannerEl.textContent = 'No saved CGPA or SGPA records found in history to auto-fill. You can enter your current standing manually.';
          DOM.toggle(this.autofillBannerEl, true);
        }
      }
    },

    /**
     * Validate all four inputs
     * @returns {{ valid: boolean, cur?: number, comp?: number, tgt?: number, rem?: number, errors?: string[] }}
     */
    validate() {
      const { DOM, Storage } = global.GradeMate;
      const prefs = Storage.getPreferences();
      const maxScale = prefs.maxScalePoint || 10.0;

      const errors = [];

      // Reset invalid borders
      const inputs = [
        this.currentCgpaInput,
        this.completedCreditsInput,
        this.desiredCgpaInput,
        this.remainingCreditsInput
      ];
      inputs.forEach((input) => {
        if (input) input.classList.remove('is-invalid');
      });

      // 1. Current CGPA
      const rawCur = this.currentCgpaInput ? this.currentCgpaInput.value.trim() : '';
      const cur = parseFloat(rawCur);
      if (rawCur === '' || !Number.isFinite(cur) || isNaN(cur)) {
        errors.push('Current CGPA must be a valid finite number.');
        if (this.currentCgpaInput) this.currentCgpaInput.classList.add('is-invalid');
      } else if (cur < 0 || cur > maxScale) {
        errors.push(`Current CGPA (${cur}) must be between 0.00 and ${maxScale.toFixed(1)}.`);
        if (this.currentCgpaInput) this.currentCgpaInput.classList.add('is-invalid');
      }

      // 2. Completed Credits
      const rawComp = this.completedCreditsInput ? this.completedCreditsInput.value.trim() : '';
      const comp = parseFloat(rawComp);
      if (rawComp === '' || !Number.isFinite(comp) || isNaN(comp)) {
        errors.push('Completed credits must be a valid finite number.');
        if (this.completedCreditsInput) this.completedCreditsInput.classList.add('is-invalid');
      } else if (comp < 0) {
        errors.push('Completed credits cannot be negative.');
        if (this.completedCreditsInput) this.completedCreditsInput.classList.add('is-invalid');
      }

      // 3. Target CGPA
      const rawTgt = this.desiredCgpaInput ? this.desiredCgpaInput.value.trim() : '';
      const tgt = parseFloat(rawTgt);
      if (rawTgt === '' || !Number.isFinite(tgt) || isNaN(tgt)) {
        errors.push('Target CGPA must be a valid finite number.');
        if (this.desiredCgpaInput) this.desiredCgpaInput.classList.add('is-invalid');
      } else if (tgt <= 0 || tgt > maxScale) {
        errors.push(`Target CGPA must be greater than 0 and at most ${maxScale.toFixed(1)} on the active grading scale.`);
        if (this.desiredCgpaInput) this.desiredCgpaInput.classList.add('is-invalid');
      }

      // 4. Remaining Credits
      const rawRem = this.remainingCreditsInput ? this.remainingCreditsInput.value.trim() : '';
      const rem = parseFloat(rawRem);
      if (rawRem === '' || !Number.isFinite(rem) || isNaN(rem)) {
        errors.push('Remaining credits must be a valid finite number.');
        if (this.remainingCreditsInput) this.remainingCreditsInput.classList.add('is-invalid');
      } else if (rem <= 0) {
        errors.push('Remaining credits must be a positive number greater than zero to plan future semesters.');
        if (this.remainingCreditsInput) this.remainingCreditsInput.classList.add('is-invalid');
      }

      // 5. Inconsistent combination: Current CGPA > 0 with Completed Credits == 0
      if (Number.isFinite(cur) && cur > 0 && Number.isFinite(comp) && comp === 0) {
        errors.push('Inconsistent input: Current CGPA cannot be greater than 0 if Completed Credits is 0. Please enter your completed credits, or set Current CGPA to 0.00 if starting semester 1.');
        if (this.currentCgpaInput) this.currentCgpaInput.classList.add('is-invalid');
        if (this.completedCreditsInput) this.completedCreditsInput.classList.add('is-invalid');
      }

      // Check errors
      if (errors.length > 0) {
        if (this.validationListEl) {
          this.validationListEl.innerHTML = errors.map((err) => `<li>${DOM.escapeHTML(err)}</li>`).join('');
        }
        DOM.toggle(this.validationBoxEl, true);
        this.validationBoxEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return { valid: false, errors };
      }

      DOM.toggle(this.validationBoxEl, false);
      return { valid: true, cur, comp, tgt, rem };
    },

    /**
     * Calculate Target Plan and Feasibility
     */
    calculate() {
      const validation = this.validate();
      if (!validation.valid) {
        this.clearResultPanel();
        return;
      }

      const { Calculations, Storage, DOM } = global.GradeMate;
      const prefs = Storage.getPreferences();
      const maxScale = prefs.maxScalePoint || 10.0;
      const precision = typeof prefs.decimalPrecision === 'number' ? prefs.decimalPrecision : 2;

      const result = Calculations.calculateTargetSGPA(
        validation.cur,
        validation.comp,
        validation.tgt,
        validation.rem,
        maxScale
      );

      // Populate Metrics
      if (this.totalCreditsValueEl) {
        this.totalCreditsValueEl.textContent = Number.isInteger(result.totalCredits)
          ? result.totalCredits.toString()
          : parseFloat(result.totalCredits.toFixed(2)).toString();
      }
      if (this.benchmarkValueEl) {
        this.benchmarkValueEl.textContent = Calculations.formatPrecision(validation.tgt, precision);
      }
      if (this.maxCgpaValueEl) {
        this.maxCgpaValueEl.textContent = Calculations.formatPrecision(result.maxPossibleCGPA, precision);
      }

      // Status Badge Handling
      if (this.statusBadgeEl) {
        if (result.status === 'achieved') {
          this.statusBadgeEl.className = 'badge badge-achieved';
          this.statusBadgeEl.textContent = 'Goal Already Met';
        } else if (result.status === 'impossible') {
          this.statusBadgeEl.className = 'badge badge-impossible';
          this.statusBadgeEl.textContent = 'Mathematically Unattainable';
        } else {
          this.statusBadgeEl.className = 'badge badge-purple';
          this.statusBadgeEl.textContent = 'Achievable Goal';
        }
      }

      // Required SGPA Card Handling (Per Clarification #1)
      if (this.requiredSgpaValueEl && this.labelRequiredSgpaEl && this.subRequiredSgpaEl) {
        if (result.status === 'achieved') {
          this.labelRequiredSgpaEl.textContent = 'Target Maintenance SGPA';
          this.requiredSgpaValueEl.textContent = Calculations.formatPrecision(result.requiredSGPA, precision);
          if (result.requiredSGPA > 0) {
            this.subRequiredSgpaEl.textContent = 'Minimum average needed to maintain target';
          } else {
            this.subRequiredSgpaEl.textContent = 'Target guaranteed even with 0.00 in remaining credits';
          }
        } else if (result.status === 'impossible') {
          this.labelRequiredSgpaEl.textContent = 'Required Average SGPA';
          this.requiredSgpaValueEl.textContent = Calculations.formatPrecision(result.requiredSGPA, precision);
          this.subRequiredSgpaEl.textContent = `Exceeds maximum ${maxScale.toFixed(1)} scale point`;
        } else {
          this.labelRequiredSgpaEl.textContent = 'Required Average SGPA';
          this.requiredSgpaValueEl.textContent = Calculations.formatPrecision(result.requiredSGPA, precision);
          this.subRequiredSgpaEl.textContent = 'Average needed across remaining credits';
        }
      }

      // Advisory Commentary Generation
      if (this.advisoryTextEl) {
        let advisoryText = '';
        if (result.status === 'achieved') {
          advisoryText = `Congratulations! Your existing cumulative GPA of ${Calculations.formatPrecision(validation.cur, precision)} has already reached your target graduation benchmark of ${Calculations.formatPrecision(validation.tgt, precision)}. `;
          if (result.requiredSGPA > 0) {
            advisoryText += `To maintain a final CGPA of at least ${Calculations.formatPrecision(validation.tgt, precision)}, you only need an average SGPA of ${Calculations.formatPrecision(result.requiredSGPA, precision)} across your remaining ${validation.rem} credits.`;
          } else {
            advisoryText += `Because you have completed ${validation.comp} credits at this standing, your final cumulative GPA will stay at or above ${Calculations.formatPrecision(validation.tgt, precision)} regardless of remaining semester grade points (even if passing with 0.00 SGPA, your final CGPA would be ${Calculations.formatPrecision((validation.cur * validation.comp) / result.totalCredits, precision)}).`;
          }
        } else if (result.status === 'impossible') {
          advisoryText = `With ${validation.comp} completed credits at a ${Calculations.formatPrecision(validation.cur, precision)} CGPA, achieving a graduation target of ${Calculations.formatPrecision(validation.tgt, precision)} is mathematically unattainable across your remaining ${validation.rem} credits. `;
          advisoryText += `Even with a perfect score of ${maxScale.toFixed(1)} in every single remaining credit, the highest final CGPA you can possibly achieve is ${Calculations.formatPrecision(result.maxPossibleCGPA, precision)}. `;
          advisoryText += `Recommendation: Consider setting your target CGPA to ${Calculations.formatPrecision(result.maxPossibleCGPA, precision)} or lower, or extending your degree with additional elective credits.`;
        } else {
          advisoryText = `Your degree graduation target of ${Calculations.formatPrecision(validation.tgt, precision)} is achievable! `;
          advisoryText += `You must achieve an average SGPA of ${Calculations.formatPrecision(result.requiredSGPA, precision)} across your remaining ${validation.rem} credits to reach this goal. `;
          advisoryText += `If you perform at the maximum theoretical level (${maxScale.toFixed(1)}), you could potentially graduate with a CGPA as high as ${Calculations.formatPrecision(result.maxPossibleCGPA, precision)}.`;
        }
        this.advisoryTextEl.textContent = advisoryText;
      }

      // Display Results Panel
      DOM.toggle(this.resultPanelEl, true);
      this.resultPanelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Clear results panel on edit or reset
     */
    clearResultPanel() {
      const { DOM } = global.GradeMate;
      if (this.resultPanelEl) {
        DOM.toggle(this.resultPanelEl, false);
      }
    },

    /**
     * Reset form inputs, validation, and feedback
     */
    handleReset() {
      const { DOM } = global.GradeMate;

      if (this.currentCgpaInput) {
        this.currentCgpaInput.value = '';
        this.currentCgpaInput.classList.remove('is-invalid');
      }
      if (this.completedCreditsInput) {
        this.completedCreditsInput.value = '';
        this.completedCreditsInput.classList.remove('is-invalid');
      }
      if (this.desiredCgpaInput) {
        this.desiredCgpaInput.value = '';
        this.desiredCgpaInput.classList.remove('is-invalid');
      }
      if (this.remainingCreditsInput) {
        this.remainingCreditsInput.value = '';
        this.remainingCreditsInput.classList.remove('is-invalid');
      }

      if (this.validationBoxEl) {
        DOM.toggle(this.validationBoxEl, false);
      }
      if (this.validationListEl) {
        this.validationListEl.innerHTML = '';
      }
      if (this.autofillBannerEl) {
        DOM.toggle(this.autofillBannerEl, false);
      }

      this.clearResultPanel();
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.Views = global.GradeMate.Views || {};
  global.GradeMate.Views.Target = TargetView;
})(window);
