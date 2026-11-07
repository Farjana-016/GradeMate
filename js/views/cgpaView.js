/**
 * GradeMate — CGPA Calculator View Controller
 * Phase 4: Semester Rows, SGPA History Import, Credit-Weighted Calculation & Safe Save
 */

(function (global) {
  'use strict';

  const CGPAView = {
    initialized: false,
    currentCalculation: null,

    // DOM References
    containerEl: null,
    titleInputEl: null,
    btnImportEl: null,
    scaleNameEl: null,
    importBannerEl: null,
    rowsContainerEl: null,
    btnAddRowEl: null,
    btnResetEl: null,
    btnCalculateEl: null,
    validationBoxEl: null,
    validationListEl: null,
    resultPanelEl: null,
    finalValueEl: null,
    totalCreditsEl: null,
    semesterCountEl: null,
    totalPointsEl: null,
    resultBadgeEl: null,
    btnSaveEl: null,
    saveStatusEl: null,
    saveFeedbackEl: null,

    /**
     * Initialize CGPA View elements and event listeners
     */
    init() {
      if (this.initialized) return;
      const { DOM, State } = global.GradeMate;

      this.containerEl = DOM.qs('#view-cgpa');
      if (!this.containerEl) return;

      this.titleInputEl = DOM.qs('#cgpa-calc-title', this.containerEl);
      this.btnImportEl = DOM.qs('#btn-import-sgpa', this.containerEl);
      this.scaleNameEl = DOM.qs('#cgpa-scale-name', this.containerEl);
      this.importBannerEl = DOM.qs('#cgpa-import-banner', this.containerEl);
      this.rowsContainerEl = DOM.qs('#cgpa-semester-rows', this.containerEl);
      this.btnAddRowEl = DOM.qs('#btn-add-semester', this.containerEl);
      this.btnResetEl = DOM.qs('#btn-reset-cgpa', this.containerEl);
      this.btnCalculateEl = DOM.qs('#btn-calculate-cgpa', this.containerEl);
      this.validationBoxEl = DOM.qs('#cgpa-validation-box', this.containerEl);
      this.validationListEl = DOM.qs('#cgpa-validation-list', this.containerEl);
      this.resultPanelEl = DOM.qs('#cgpa-result-panel', this.containerEl);
      this.finalValueEl = DOM.qs('#cgpa-final-value', this.containerEl);
      this.totalCreditsEl = DOM.qs('#cgpa-total-credits', this.containerEl);
      this.semesterCountEl = DOM.qs('#cgpa-semester-count', this.containerEl);
      this.totalPointsEl = DOM.qs('#cgpa-total-points', this.containerEl);
      this.resultBadgeEl = DOM.qs('#cgpa-result-badge', this.containerEl);
      this.btnSaveEl = DOM.qs('#btn-save-cgpa', this.containerEl);
      this.saveStatusEl = DOM.qs('#cgpa-save-status', this.containerEl);
      this.saveFeedbackEl = DOM.qs('#cgpa-save-feedback', this.containerEl);

      // Bind Import Button
      if (this.btnImportEl) {
        DOM.on(this.btnImportEl, 'click', () => this.importFromSGPAHistory());
      }

      // Bind Row & Table Action Buttons
      if (this.btnAddRowEl) {
        DOM.on(this.btnAddRowEl, 'click', () => this.addRow());
      }

      if (this.btnResetEl) {
        DOM.on(this.btnResetEl, 'click', () => this.handleReset());
      }

      if (this.btnCalculateEl) {
        DOM.on(this.btnCalculateEl, 'click', () => this.calculate());
      }

      if (this.btnSaveEl) {
        DOM.on(this.btnSaveEl, 'click', () => this.save());
      }

      // Invalidate results when title changes
      if (this.titleInputEl) {
        DOM.on(this.titleInputEl, 'input', () => this.clearResultPanel());
      }

      // Update scale display when preferences change
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

      // If rows are completely empty, start with 2 default rows (Semester 1 & Semester 2)
      if (this.rowsContainerEl && this.rowsContainerEl.children.length === 0) {
        this.addRow({ semester: 'Semester 1' });
        this.addRow({ semester: 'Semester 2' });
      }
    },

    /**
     * Update active scale display badge
     */
    updateScaleBadge() {
      const { Storage } = global.GradeMate;
      const prefs = Storage.getPreferences();
      if (this.scaleNameEl) {
        const scaleTitle = prefs.gradingSystemId === 'scale_4_us'
          ? '4.0 US Scale'
          : `${prefs.maxScalePoint || 10}-Point Scale`;
        this.scaleNameEl.textContent = scaleTitle;
      }
    },

    /**
     * Add a dynamic semester row
     * @param {{ semester?: string, sgpa?: number|string, credits?: number|string }} [data={}]
     */
    addRow(data = {}) {
      if (!this.rowsContainerEl) return;
      const { DOM, Storage } = global.GradeMate;
      const prefs = Storage.getPreferences();
      const maxScale = prefs.maxScalePoint || 10.0;

      const row = document.createElement('div');
      row.className = 'semester-row';

      const existingRowCount = this.rowsContainerEl.children.length;
      const defaultSemLabel = `Semester ${existingRowCount + 1}`;
      const targetSem = data.semester || defaultSemLabel;

      const isStandardSem = /Semester\s+\d+/i.test(targetSem);
      const isCustom = !isStandardSem && Boolean(targetSem);

      let semOptions = '';
      for (let s = 1; s <= 8; s++) {
        const optVal = `Semester ${s}`;
        const isSel = (!isCustom && targetSem.toLowerCase() === optVal.toLowerCase()) ? 'selected' : '';
        semOptions += `<option value="${optVal}" ${isSel}>${optVal}</option>`;
      }
      semOptions += `<option value="custom" ${isCustom ? 'selected' : ''}>Custom Semester...</option>`;

      row.innerHTML = `
        <div class="row-num" aria-hidden="true">1</div>
        <div class="semester-card-header">
          <span class="semester-card-title">Semester <span class="card-sem-num">1</span></span>
          <button type="button" class="btn-remove-row btn-remove-card" aria-label="Remove semester">
            Remove
          </button>
        </div>
        <div class="col-input-wrap semester-col-select">
          <label class="mobile-field-label">Academic Semester</label>
          <select class="form-select semester-name-select" aria-label="Select semester">
            ${semOptions}
          </select>
          <input 
            type="text" 
            class="form-input semester-custom-input ${isCustom ? '' : 'is-hidden'}" 
            placeholder="e.g., Summer 2026" 
            value="${isCustom ? DOM.escapeHTML(targetSem) : ''}"
            maxlength="40"
            aria-label="Custom semester name"
          >
        </div>
        <div class="col-input-wrap col-sgpa-wrap">
          <label class="mobile-field-label">Semester SGPA</label>
          <input 
            type="number" 
            class="form-input semester-sgpa-input" 
            placeholder="e.g., 8.50" 
            value="${data.sgpa !== undefined ? data.sgpa : ''}" 
            min="0" 
            max="${maxScale}" 
            step="0.01"
            aria-label="Semester SGPA"
          >
        </div>
        <div class="col-input-wrap col-credits-wrap">
          <label class="mobile-field-label">Total Credits</label>
          <input 
            type="number" 
            class="form-input semester-credits-input" 
            placeholder="e.g., 20.0" 
            value="${data.credits !== undefined ? data.credits : ''}" 
            min="0.5" 
            max="60" 
            step="0.5"
            aria-label="Semester credits"
          >
        </div>
        <div class="col-action-wrap">
          <button type="button" class="btn-remove-row" aria-label="Remove semester row">
            Remove
          </button>
        </div>
      `;

      // Semester selection dropdown toggle for custom text input
      const semSelect = row.querySelector('.semester-name-select');
      const customInput = row.querySelector('.semester-custom-input');
      semSelect.addEventListener('change', () => {
        const customActive = semSelect.value === 'custom';
        DOM.toggle(customInput, customActive);
        if (customActive) {
          customInput.focus();
        }
        this.clearResultPanel();
      });

      // Bind Remove Buttons (both mobile card header & desktop table cell)
      const removeBtns = row.querySelectorAll('.btn-remove-row');
      removeBtns.forEach((removeBtn) => {
        removeBtn.addEventListener('click', () => {
          if (this.rowsContainerEl.children.length > 1) {
            row.remove();
            this.reindexRows();
            this.clearResultPanel();
          }
        });
      });

      // Clear results on editing to prevent stale results
      const inputs = row.querySelectorAll('input, select');
      inputs.forEach((input) => {
        input.addEventListener('input', () => this.clearResultPanel());
        input.addEventListener('change', () => this.clearResultPanel());
      });

      this.rowsContainerEl.appendChild(row);
      this.reindexRows();
    },

    /**
     * Re-index row numbers and update remove button state
     */
    reindexRows() {
      if (!this.rowsContainerEl) return;
      const rows = Array.from(this.rowsContainerEl.children);
      const rowCount = rows.length;

      rows.forEach((row, idx) => {
        const rowNumber = idx + 1;
        const numEl = row.querySelector('.row-num');
        if (numEl) numEl.textContent = String(rowNumber);

        const cardNumEl = row.querySelector('.card-sem-num');
        if (cardNumEl) cardNumEl.textContent = String(rowNumber);

        const removeBtns = row.querySelectorAll('.btn-remove-row');
        removeBtns.forEach((btn) => {
          btn.disabled = rowCount <= 1;
        });
      });
    },

    /**
     * Import unique semester records from SGPA History
     * Requirements:
     * - Only latest saved calculation per unique semester.
     * - Does NOT modify original SGPA history records.
     * - Does NOT automatically save a CGPA calculation.
     * - Shows helpful feedback if no records available.
     */
    importFromSGPAHistory() {
      const { Storage, DOM } = global.GradeMate;
      const sgpaHistory = Storage.getSGPAHistory() || [];

      // Case A: No saved SGPA records
      if (!Array.isArray(sgpaHistory) || sgpaHistory.length === 0) {
        if (this.importBannerEl) {
          this.importBannerEl.className = 'import-banner is-warning';
          this.importBannerEl.textContent = 'No saved SGPA records found in history to import. You can add semesters manually.';
          DOM.toggle(this.importBannerEl, true);
        }
        return;
      }

      // Group and pick latest calculation for each unique semester
      // Sort descending by calculatedAt/updatedAt so the first encountered is latest
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
            semester: semName,
            sgpa: rec.sgpa,
            credits: rec.totalCredits
          });
        }
      });

      const importedList = Array.from(uniqueSemesterMap.values());

      // Optional sort by standard semester number
      importedList.sort((a, b) => {
        const numA = parseInt((a.semester.match(/\d+/) || [0])[0], 10);
        const numB = parseInt((b.semester.match(/\d+/) || [0])[0], 10);
        return numA - numB;
      });

      // Populate into rows
      if (this.rowsContainerEl) {
        this.rowsContainerEl.innerHTML = '';
        importedList.forEach((item) => {
          this.addRow(item);
        });
      }

      // Default Title Suggestion
      if (this.titleInputEl && !this.titleInputEl.value.trim()) {
        const count = importedList.length;
        this.titleInputEl.value = `Cumulative CGPA (${count} Semesters)`;
      }

      this.clearResultPanel();

      // Show Import Confirmation Banner
      if (this.importBannerEl) {
        this.importBannerEl.className = 'import-banner is-info';
        this.importBannerEl.textContent = `Imported ${importedList.length} unique semester ${importedList.length === 1 ? 'record' : 'records'} from SGPA History. You can edit any entries or add additional semesters before calculating.`;
        DOM.toggle(this.importBannerEl, true);
      }
    },

    /**
     * Validate all semester rows
     * @returns {{ valid: boolean, errors: string[], semesters?: Array, title?: string }}
     */
    validate() {
      const { DOM, Storage } = global.GradeMate;
      const prefs = Storage.getPreferences();
      const maxScalePoint = prefs.maxScalePoint || 10.0;

      const errors = [];
      const semesters = [];
      const seenSemesters = new Set();

      const rows = Array.from(this.rowsContainerEl.children);
      if (rows.length === 0) {
        errors.push('At least one semester row is required to calculate CGPA.');
      }

      rows.forEach((row, idx) => {
        const rowNumber = idx + 1;
        const semSelect = row.querySelector('.semester-name-select');
        const customInput = row.querySelector('.semester-custom-input');
        const sgpaInput = row.querySelector('.semester-sgpa-input');
        const credInput = row.querySelector('.semester-credits-input');

        let semName = semSelect.value === 'custom' 
          ? (customInput.value || '').trim() 
          : semSelect.value;

        const rawSgpa = sgpaInput.value;
        const rawCred = credInput.value;
        const sgpaVal = parseFloat(rawSgpa);
        const credVal = parseFloat(rawCred);

        // Reset error borders
        semSelect.classList.remove('is-invalid');
        customInput.classList.remove('is-invalid');
        sgpaInput.classList.remove('is-invalid');
        credInput.classList.remove('is-invalid');

        let rowHasError = false;

        // Semester Name Validation
        if (!semName) {
          errors.push(`Row #${rowNumber}: Please specify a valid semester name.`);
          if (semSelect.value === 'custom') {
            customInput.classList.add('is-invalid');
          } else {
            semSelect.classList.add('is-invalid');
          }
          rowHasError = true;
        } else {
          // Duplicate Semester Detection
          const semKey = semName.toLowerCase();
          if (seenSemesters.has(semKey)) {
            errors.push(`Row #${rowNumber}: Duplicate semester '${semName}'. Each semester can only be included once in a calculation.`);
            semSelect.classList.add('is-invalid');
            if (semSelect.value === 'custom') customInput.classList.add('is-invalid');
            rowHasError = true;
          } else {
            seenSemesters.add(semKey);
          }
        }

        // SGPA Validation (Must be finite number and within [0, maxScalePoint])
        if (rawSgpa === '' || !Number.isFinite(sgpaVal) || isNaN(sgpaVal)) {
          errors.push(`Row #${rowNumber}: SGPA must be a valid finite number.`);
          sgpaInput.classList.add('is-invalid');
          rowHasError = true;
        } else if (sgpaVal < 0 || sgpaVal > maxScalePoint) {
          errors.push(`Row #${rowNumber}: SGPA (${sgpaVal}) must be between 0.00 and ${maxScalePoint.toFixed(1)}.`);
          sgpaInput.classList.add('is-invalid');
          rowHasError = true;
        }

        // Credits Validation (Must be finite number and > 0)
        if (rawCred === '' || !Number.isFinite(credVal) || isNaN(credVal) || credVal <= 0) {
          errors.push(`Row #${rowNumber}: Total credits must be a positive finite number greater than zero.`);
          credInput.classList.add('is-invalid');
          rowHasError = true;
        }

        if (!rowHasError) {
          semesters.push({
            semester: semName,
            sgpa: sgpaVal,
            credits: credVal
          });
        }
      });

      // Prevent division by zero
      const totalCreds = semesters.reduce((sum, s) => sum + s.credits, 0);
      if (semesters.length > 0 && totalCreds <= 0) {
        errors.push('Total completed credits across all semesters must be greater than zero.');
      }

      // Display validation errors or clear banner
      if (errors.length > 0) {
        if (this.validationListEl) {
          this.validationListEl.innerHTML = errors.map((err) => `<li>${DOM.escapeHTML(err)}</li>`).join('');
        }
        DOM.toggle(this.validationBoxEl, true);
        this.validationBoxEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return { valid: false, errors };
      }

      DOM.toggle(this.validationBoxEl, false);
      const title = (this.titleInputEl.value || '').trim() || `Cumulative CGPA (${semesters.length} Semesters)`;
      return { valid: true, semesters, title };
    },

    /**
     * Calculate Credit-Weighted CGPA
     */
    calculate() {
      const validation = this.validate();
      if (!validation.valid) {
        this.clearResultPanel();
        return;
      }

      const { Calculations, Storage, DOM } = global.GradeMate;
      const prefs = Storage.getPreferences();
      const precision = typeof prefs.decimalPrecision === 'number' ? prefs.decimalPrecision : 2;

      // Credit-weighted calculation
      const { cgpa, totalCredits, semesterCount, totalPoints } = Calculations.calculateCGPA(validation.semesters);

      // Cache calculation
      this.currentCalculation = {
        title: validation.title,
        cgpa,
        totalCredits,
        totalPoints,
        semesterCount,
        semesters: validation.semesters
      };

      // Display results in UI
      if (this.finalValueEl) {
        this.finalValueEl.textContent = Calculations.formatPrecision(cgpa, precision);
      }
      if (this.totalCreditsEl) {
        this.totalCreditsEl.textContent = Number.isInteger(totalCredits)
          ? totalCredits.toString()
          : parseFloat(totalCredits.toFixed(2)).toString();
      }
      if (this.semesterCountEl) {
        this.semesterCountEl.textContent = String(semesterCount);
      }
      if (this.totalPointsEl) {
        this.totalPointsEl.textContent = Calculations.formatPrecision(totalPoints, 2);
      }
      if (this.resultBadgeEl) {
        this.resultBadgeEl.textContent = `${semesterCount} ${semesterCount === 1 ? 'Semester' : 'Semesters'}`;
      }

      DOM.toggle(this.saveFeedbackEl, false);
      DOM.toggle(this.resultPanelEl, true);
      this.resultPanelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Save calculation record to CGPA History
     */
    save() {
      if (!this.currentCalculation) return;

      const { Storage, State, DOM } = global.GradeMate;
      const cgpaHistory = Storage.getCGPAHistory() || [];

      const newRecord = {
        id: `cgpa_${Date.now()}`,
        title: this.currentCalculation.title,
        cgpa: this.currentCalculation.cgpa,
        totalCredits: this.currentCalculation.totalCredits,
        totalPoints: this.currentCalculation.totalPoints,
        semesterCount: this.currentCalculation.semesterCount,
        semesters: this.currentCalculation.semesters,
        calculatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      cgpaHistory.push(newRecord);
      Storage.saveCGPAHistory(cgpaHistory);

      // Emit event to update Dashboard immediately
      State.emit('history:updated');

      if (this.saveFeedbackEl) {
        this.saveFeedbackEl.className = 'save-feedback-banner is-success';
        this.saveFeedbackEl.textContent = `Successfully saved "${newRecord.title}" to CGPA History. Dashboard has updated with your latest cumulative performance.`;
        DOM.toggle(this.saveFeedbackEl, true);
      }
    },

    /**
     * Reset CGPA Calculator form
     * Does NOT delete saved history!
     */
    handleReset() {
      const { DOM } = global.GradeMate;
      if (this.rowsContainerEl) {
        this.rowsContainerEl.innerHTML = '';
        this.addRow({ semester: 'Semester 1' });
        this.addRow({ semester: 'Semester 2' });
      }

      if (this.titleInputEl) {
        this.titleInputEl.value = '';
      }

      this.clearResultPanel();
      DOM.toggle(this.validationBoxEl, false);
      DOM.toggle(this.importBannerEl, false);
      this.currentCalculation = null;
    },

    /**
     * Clear calculated results panel
     */
    clearResultPanel() {
      const { DOM } = global.GradeMate;
      DOM.toggle(this.resultPanelEl, false);
      DOM.toggle(this.saveFeedbackEl, false);
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.Views = global.GradeMate.Views || {};
  global.GradeMate.Views.CGPA = CGPAView;
})(window);
