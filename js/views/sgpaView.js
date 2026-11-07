/**
 * GradeMate — SGPA Calculator View Controller
 * Phase 3: Dynamic Subject Table, Active Scale Grade Mapping, Calculation Engine & Safe Save
 */

(function (global) {
  'use strict';

  const SGPAView = {
    initialized: false,
    currentCalculation: null,

    // DOM References
    containerEl: null,
    semesterSelectEl: null,
    customSemesterInputEl: null,
    scaleNameEl: null,
    rowsContainerEl: null,
    btnAddRowEl: null,
    btnResetEl: null,
    btnCalculateEl: null,
    validationBoxEl: null,
    validationListEl: null,
    resultPanelEl: null,
    finalValueEl: null,
    totalCreditsEl: null,
    totalPointsEl: null,
    resultBadgeEl: null,
    btnSaveEl: null,
    existingNoticeEl: null,
    saveFeedbackEl: null,

    /**
     * Initialize SGPA View elements and event listeners
     */
    init() {
      if (this.initialized) return;
      const { DOM, State } = global.GradeMate;

      this.containerEl = DOM.qs('#view-sgpa');
      if (!this.containerEl) return;

      this.semesterSelectEl = DOM.qs('#sgpa-semester-select', this.containerEl);
      this.customSemesterInputEl = DOM.qs('#sgpa-custom-semester', this.containerEl);
      this.scaleNameEl = DOM.qs('#sgpa-scale-name', this.containerEl);
      this.rowsContainerEl = DOM.qs('#sgpa-subject-rows', this.containerEl);
      this.btnAddRowEl = DOM.qs('#btn-add-subject', this.containerEl);
      this.btnResetEl = DOM.qs('#btn-reset-sgpa', this.containerEl);
      this.btnCalculateEl = DOM.qs('#btn-calculate-sgpa', this.containerEl);
      this.validationBoxEl = DOM.qs('#sgpa-validation-box', this.containerEl);
      this.validationListEl = DOM.qs('#sgpa-validation-list', this.containerEl);
      this.resultPanelEl = DOM.qs('#sgpa-result-panel', this.containerEl);
      this.finalValueEl = DOM.qs('#sgpa-final-value', this.containerEl);
      this.totalCreditsEl = DOM.qs('#sgpa-total-credits', this.containerEl);
      this.totalPointsEl = DOM.qs('#sgpa-total-points', this.containerEl);
      this.resultBadgeEl = DOM.qs('#sgpa-result-semester-badge', this.containerEl);
      this.btnSaveEl = DOM.qs('#btn-save-sgpa', this.containerEl);
      this.existingNoticeEl = DOM.qs('#sgpa-existing-notice', this.containerEl);
      this.saveFeedbackEl = DOM.qs('#sgpa-save-feedback', this.containerEl);

      // Bind Semester Select Change
      if (this.semesterSelectEl) {
        DOM.on(this.semesterSelectEl, 'change', () => {
          const isCustom = this.semesterSelectEl.value === 'custom';
          DOM.toggle(this.customSemesterInputEl, isCustom);
          if (isCustom && this.customSemesterInputEl) {
            this.customSemesterInputEl.focus();
          }
          this.checkExistingSemesterNotice();
        });
      }

      if (this.customSemesterInputEl) {
        DOM.on(this.customSemesterInputEl, 'input', () => {
          this.checkExistingSemesterNotice();
        });
      }

      // Bind Buttons
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

      // Re-populate dropdowns if user updates grading preferences
      State.on('preferences:updated', () => {
        this.updateScaleBadge();
        this.refreshGradeDropdowns();
      });

      this.initialized = true;
    },

    /**
     * View activation hook
     */
    onActivate() {
      this.init();
      this.updateScaleBadge();

      // If rows are completely empty, start with 4 default rows
      if (this.rowsContainerEl && this.rowsContainerEl.children.length === 0) {
        for (let i = 0; i < 4; i++) {
          this.addRow();
        }
      }

      this.checkExistingSemesterNotice();
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
     * Get active semester label
     * @returns {string}
     */
    getSelectedSemester() {
      if (this.semesterSelectEl.value === 'custom') {
        return (this.customSemesterInputEl.value || '').trim() || 'Custom Semester';
      }
      return this.semesterSelectEl.value;
    },

    /**
     * Check if the currently selected semester already exists in saved history
     */
    checkExistingSemesterNotice() {
      if (!this.existingNoticeEl) return;
      const { Storage } = global.GradeMate;
      const sgpaHistory = Storage.getSGPAHistory() || [];
      const currentSemester = this.getSelectedSemester().toLowerCase();

      const exists = sgpaHistory.some(
        (rec) => (rec.semester || '').trim().toLowerCase() === currentSemester
      );

      if (exists) {
        this.existingNoticeEl.textContent = `A saved record already exists for ${this.getSelectedSemester()}. Saving will update it without creating duplicates.`;
      } else {
        this.existingNoticeEl.textContent = `Ready to save this semester's breakdown to your calculation history.`;
      }
    },

    /**
     * Add a subject row to the table
     */
    addRow(data = { name: '', credits: '', grade: '' }) {
      if (!this.rowsContainerEl) return;
      const { Storage } = global.GradeMate;
      const prefs = Storage.getPreferences();
      const customGrades = Array.isArray(prefs.customGrades) ? prefs.customGrades : [];

      const row = document.createElement('div');
      row.className = 'subject-row';

      // Build Grade Dropdown Options
      let gradeOptions = `<option value="">Select Grade</option>`;
      customGrades.forEach((g) => {
        const isSelected = data.grade && data.grade.toUpperCase() === g.grade.toUpperCase() ? 'selected' : '';
        gradeOptions += `<option value="${g.grade}" data-points="${g.points}" ${isSelected}>${g.grade} (${g.points} pts)</option>`;
      });

      row.innerHTML = `
        <div class="row-num">1</div>
        <div class="col-input-wrap">
          <input 
            type="text" 
            class="form-input subject-name-input" 
            placeholder="e.g., Data Structures" 
            value="${data.name || ''}"
            maxlength="80"
            aria-label="Subject name"
          >
        </div>
        <div class="col-input-wrap">
          <input 
            type="number" 
            class="form-input subject-credits-input" 
            placeholder="Credits" 
            value="${data.credits !== undefined ? data.credits : ''}" 
            min="0.5" 
            max="30" 
            step="0.5"
            aria-label="Subject credits"
          >
        </div>
        <div class="col-input-wrap">
          <select class="form-select subject-grade-select" aria-label="Subject grade">
            ${gradeOptions}
          </select>
        </div>
        <div class="col-action-wrap">
          <button type="button" class="btn-remove-row" aria-label="Remove subject row">
            Remove
          </button>
        </div>
      `;

      // Bind Remove Button
      const removeBtn = row.querySelector('.btn-remove-row');
      removeBtn.addEventListener('click', () => {
        if (this.rowsContainerEl.children.length > 1) {
          row.remove();
          this.reindexRows();
          this.clearResultPanel();
        }
      });

      // Clear results upon editing rows to require recalculation
      const inputs = row.querySelectorAll('input, select');
      inputs.forEach((input) => {
        input.addEventListener('input', () => this.clearResultPanel());
        input.addEventListener('change', () => this.clearResultPanel());
      });

      this.rowsContainerEl.appendChild(row);
      this.reindexRows();
    },

    /**
     * Re-index row numbers and toggle remove button availability
     */
    reindexRows() {
      if (!this.rowsContainerEl) return;
      const rows = Array.from(this.rowsContainerEl.children);
      const rowCount = rows.length;

      rows.forEach((row, idx) => {
        const numEl = row.querySelector('.row-num');
        if (numEl) numEl.textContent = String(idx + 1);

        const removeBtn = row.querySelector('.btn-remove-row');
        if (removeBtn) {
          removeBtn.disabled = rowCount <= 1;
        }
      });
    },

    /**
     * Refresh grade dropdowns in existing rows when academic preferences change
     */
    refreshGradeDropdowns() {
      if (!this.rowsContainerEl) return;
      const { Storage } = global.GradeMate;
      const prefs = Storage.getPreferences();
      const customGrades = Array.isArray(prefs.customGrades) ? prefs.customGrades : [];

      const rows = Array.from(this.rowsContainerEl.children);
      rows.forEach((row) => {
        const select = row.querySelector('.subject-grade-select');
        if (select) {
          const currentVal = select.value;
          let opts = `<option value="">Select Grade</option>`;
          customGrades.forEach((g) => {
            const isSel = currentVal === g.grade ? 'selected' : '';
            opts += `<option value="${g.grade}" data-points="${g.points}" ${isSel}>${g.grade} (${g.points} pts)</option>`;
          });
          select.innerHTML = opts;
        }
      });
    },

    /**
     * Validate all inputs
     * @returns {{ valid: boolean, errors: string[], subjects?: Array }}
     */
    validate() {
      const { DOM, Storage } = global.GradeMate;
      const prefs = Storage.getPreferences();
      const gradeMap = new Map();
      (prefs.customGrades || []).forEach((g) => gradeMap.set(g.grade, Number(g.points)));

      const errors = [];
      const subjects = [];

      // Validate Semester
      const semester = this.getSelectedSemester();
      if (!semester || !semester.trim()) {
        errors.push('Please specify a valid academic semester label.');
      }

      // Validate Subject Rows
      const rows = Array.from(this.rowsContainerEl.children);
      if (rows.length === 0) {
        errors.push('At least one subject row is required to calculate SGPA.');
      }

      rows.forEach((row, idx) => {
        const rowNumber = idx + 1;
        const nameInput = row.querySelector('.subject-name-input');
        const credInput = row.querySelector('.subject-credits-input');
        const gradeSelect = row.querySelector('.subject-grade-select');

        const nameVal = (nameInput.value || '').trim();
        const credVal = parseFloat(credInput.value);
        const gradeVal = gradeSelect.value;

        // Reset invalid styles
        nameInput.classList.remove('is-invalid');
        credInput.classList.remove('is-invalid');
        gradeSelect.classList.remove('is-invalid');

        let rowHasError = false;

        if (!nameVal) {
          errors.push(`Row #${rowNumber}: Subject name cannot be empty.`);
          nameInput.classList.add('is-invalid');
          rowHasError = true;
        }

        if (isNaN(credVal) || credVal <= 0) {
          errors.push(`Row #${rowNumber}: Credits must be a positive number greater than zero.`);
          credInput.classList.add('is-invalid');
          rowHasError = true;
        }

        if (!gradeVal || !gradeMap.has(gradeVal)) {
          errors.push(`Row #${rowNumber}: Please select a valid letter grade.`);
          gradeSelect.classList.add('is-invalid');
          rowHasError = true;
        }

        if (!rowHasError) {
          subjects.push({
            id: `sub_${rowNumber}_${Date.now()}`,
            name: nameVal,
            credits: credVal,
            grade: gradeVal,
            points: gradeMap.get(gradeVal)
          });
        }
      });

      // Prevent division by zero
      const totalCreds = subjects.reduce((sum, s) => sum + s.credits, 0);
      if (subjects.length > 0 && totalCreds <= 0) {
        errors.push('Total completed credits across all subjects must be greater than zero.');
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
      return { valid: true, subjects, semester };
    },

    /**
     * Perform SGPA Calculation
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

      // Pure calculation
      const { sgpa, totalCredits, totalPoints } = Calculations.calculateSGPA(validation.subjects);

      // Cache current calculation state
      this.currentCalculation = {
        semester: validation.semester,
        sgpa,
        totalCredits,
        totalPoints,
        subjects: validation.subjects
      };

      // Display results in UI
      if (this.finalValueEl) {
        this.finalValueEl.textContent = Calculations.formatPrecision(sgpa, precision);
      }
      if (this.totalCreditsEl) {
        this.totalCreditsEl.textContent = Number.isInteger(totalCredits)
          ? totalCredits.toString()
          : parseFloat(totalCredits.toFixed(2)).toString();
      }
      if (this.totalPointsEl) {
        this.totalPointsEl.textContent = Calculations.formatPrecision(totalPoints, 2);
      }
      if (this.resultBadgeEl) {
        this.resultBadgeEl.textContent = validation.semester;
      }

      this.checkExistingSemesterNotice();
      DOM.toggle(this.saveFeedbackEl, false);
      DOM.toggle(this.resultPanelEl, true);
      this.resultPanelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Save calculation record to SGPA History
     * Strict Rule: If same semester already exists, updates record in-place without duplicate entries.
     */
    save() {
      if (!this.currentCalculation) return;

      const { Storage, State, DOM } = global.GradeMate;
      const sgpaHistory = Storage.getSGPAHistory() || [];
      const semesterKey = this.currentCalculation.semester.trim().toLowerCase();

      // Check for existing record of the same semester
      const existingIdx = sgpaHistory.findIndex(
        (rec) => (rec.semester || '').trim().toLowerCase() === semesterKey
      );

      let isUpdate = false;
      let recordId = `sgpa_${Date.now()}`;

      if (existingIdx >= 0) {
        // Update existing record
        isUpdate = true;
        recordId = sgpaHistory[existingIdx].id || recordId;
        sgpaHistory[existingIdx] = {
          ...sgpaHistory[existingIdx],
          semester: this.currentCalculation.semester,
          sgpa: this.currentCalculation.sgpa,
          totalCredits: this.currentCalculation.totalCredits,
          totalPoints: this.currentCalculation.totalPoints,
          subjects: this.currentCalculation.subjects,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Insert new record
        const newRecord = {
          id: recordId,
          semester: this.currentCalculation.semester,
          sgpa: this.currentCalculation.sgpa,
          totalCredits: this.currentCalculation.totalCredits,
          totalPoints: this.currentCalculation.totalPoints,
          subjects: this.currentCalculation.subjects,
          calculatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        sgpaHistory.push(newRecord);
      }

      // Save to LocalStorage
      Storage.saveSGPAHistory(sgpaHistory);

      // Notify reactive state (updates Dashboard immediately!)
      State.emit('history:updated');

      // Provide clear user feedback
      if (this.saveFeedbackEl) {
        this.saveFeedbackEl.className = isUpdate 
          ? 'save-feedback-banner is-updated' 
          : 'save-feedback-banner is-success';

        this.saveFeedbackEl.textContent = isUpdate
          ? `Updated existing record for ${this.currentCalculation.semester} successfully. Dashboard metrics have updated.`
          : `Saved calculation for ${this.currentCalculation.semester} to history successfully. Dashboard metrics have updated.`;

        DOM.toggle(this.saveFeedbackEl, true);
      }

      this.checkExistingSemesterNotice();
    },

    /**
     * Reset subject entries
     */
    handleReset() {
      const { DOM } = global.GradeMate;
      if (this.rowsContainerEl) {
        this.rowsContainerEl.innerHTML = '';
        for (let i = 0; i < 4; i++) {
          this.addRow();
        }
      }

      if (this.semesterSelectEl) {
        this.semesterSelectEl.value = 'Semester 1';
        DOM.toggle(this.customSemesterInputEl, false);
        if (this.customSemesterInputEl) this.customSemesterInputEl.value = '';
      }

      this.clearResultPanel();
      DOM.toggle(this.validationBoxEl, false);
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
  global.GradeMate.Views.SGPA = SGPAView;
})(window);
