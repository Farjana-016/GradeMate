/**
 * GradeMate — Settings View Controller
 * Phase 6: Profile Settings, Academic Preferences, Data Management (Export/Restore/Reset), and About
 */

(function (global) {
  'use strict';

  const PRESETS = {
    scale_10_standard: {
      id: 'scale_10_standard',
      maxScalePoint: 10.0,
      minPassGrade: 'P',
      grades: [
        { grade: 'O', points: 10.0 },
        { grade: 'A+', points: 9.0 },
        { grade: 'A', points: 8.0 },
        { grade: 'B+', points: 7.0 },
        { grade: 'B', points: 6.0 },
        { grade: 'C', points: 5.0 },
        { grade: 'P', points: 4.0 },
        { grade: 'F', points: 0.0 }
      ]
    },
    scale_4_us: {
      id: 'scale_4_us',
      maxScalePoint: 4.0,
      minPassGrade: 'D',
      grades: [
        { grade: 'A+', points: 4.0 },
        { grade: 'A', points: 4.0 },
        { grade: 'A-', points: 3.7 },
        { grade: 'B+', points: 3.3 },
        { grade: 'B', points: 3.0 },
        { grade: 'B-', points: 2.7 },
        { grade: 'C+', points: 2.3 },
        { grade: 'C', points: 2.0 },
        { grade: 'C-', points: 1.7 },
        { grade: 'D+', points: 1.3 },
        { grade: 'D', points: 1.0 },
        { grade: 'F', points: 0.0 }
      ]
    }
  };

  const SettingsView = {
    initialized: false,
    pendingRestoreJson: null,

    // DOM Elements
    containerEl: null,

    // Section 1: Profile Elements
    userNameInput: null,
    btnSaveProfileEl: null,
    profileFeedbackEl: null,

    // Section 2: Preferences Elements
    scaleSelectEl: null,
    maxScaleInput: null,
    precisionSelectEl: null,
    minPassGradeInput: null,
    gradeTbodyEl: null,
    btnAddGradeRowEl: null,
    btnSavePreferencesEl: null,
    preferencesFeedbackEl: null,

    // Section 3: Data Management Elements
    btnExportBackupEl: null,
    restoreFileInput: null,
    btnTriggerRestoreEl: null,
    restoreFeedbackEl: null,
    btnNuclearResetEl: null,

    // Restore Modal Elements
    modalRestoreEl: null,
    restorePreviewEl: null,
    btnCancelRestoreEl: null,
    btnConfirmRestoreEl: null,
    btnCloseRestoreXEl: null,

    // Reset Modal Elements
    modalResetEl: null,
    btnCancelResetEl: null,
    btnConfirmResetEl: null,
    btnCloseResetXEl: null,

    /**
     * Initialize Settings View DOM references and event listeners
     */
    init() {
      if (this.initialized) return;
      const { DOM } = global.GradeMate;

      this.containerEl = DOM.qs('#view-settings');
      if (!this.containerEl) return;

      // Section 1
      this.userNameInput = DOM.qs('#settings-user-name', this.containerEl);
      this.btnSaveProfileEl = DOM.qs('#btn-save-profile', this.containerEl);
      this.profileFeedbackEl = DOM.qs('#settings-profile-feedback', this.containerEl);

      // Section 2
      this.scaleSelectEl = DOM.qs('#settings-scale-select', this.containerEl);
      this.maxScaleInput = DOM.qs('#settings-max-scale', this.containerEl);
      this.precisionSelectEl = DOM.qs('#settings-precision-select', this.containerEl);
      this.minPassGradeInput = DOM.qs('#settings-min-pass-grade', this.containerEl);
      this.gradeTbodyEl = DOM.qs('#settings-grade-tbody', this.containerEl);
      this.btnAddGradeRowEl = DOM.qs('#btn-add-grade-row', this.containerEl);
      this.btnSavePreferencesEl = DOM.qs('#btn-save-preferences', this.containerEl);
      this.preferencesFeedbackEl = DOM.qs('#settings-preferences-feedback', this.containerEl);

      // Section 3
      this.btnExportBackupEl = DOM.qs('#btn-export-backup', this.containerEl);
      this.restoreFileInput = DOM.qs('#settings-restore-file', this.containerEl);
      this.btnTriggerRestoreEl = DOM.qs('#btn-trigger-restore', this.containerEl);
      this.restoreFeedbackEl = DOM.qs('#settings-restore-feedback', this.containerEl);
      this.btnNuclearResetEl = DOM.qs('#btn-nuclear-reset', this.containerEl);

      // Restore Modal
      this.modalRestoreEl = DOM.qs('#modal-settings-restore');
      this.restorePreviewEl = DOM.qs('#restore-meta-preview');
      this.btnCancelRestoreEl = DOM.qs('#btn-cancel-restore');
      this.btnConfirmRestoreEl = DOM.qs('#btn-confirm-restore');
      this.btnCloseRestoreXEl = DOM.qs('#btn-close-restore-x');

      // Reset Modal
      this.modalResetEl = DOM.qs('#modal-settings-reset');
      this.btnCancelResetEl = DOM.qs('#btn-cancel-reset');
      this.btnConfirmResetEl = DOM.qs('#btn-confirm-reset');
      this.btnCloseResetXEl = DOM.qs('#btn-close-reset-x');

      // Bind Section 1: Profile Save
      if (this.btnSaveProfileEl) {
        DOM.on(this.btnSaveProfileEl, 'click', () => this.saveProfile());
      }
      if (this.userNameInput) {
        DOM.on(this.userNameInput, 'input', () => {
          this.userNameInput.classList.remove('is-invalid');
          DOM.toggle(this.profileFeedbackEl, false);
        });
      }

      // Bind Section 2: Preferences
      if (this.scaleSelectEl) {
        DOM.on(this.scaleSelectEl, 'change', (e) => this.handleScaleChange(e.target.value));
      }
      if (this.btnAddGradeRowEl) {
        DOM.on(this.btnAddGradeRowEl, 'click', () => this.addGradeRow());
      }
      if (this.btnSavePreferencesEl) {
        DOM.on(this.btnSavePreferencesEl, 'click', () => this.savePreferences());
      }

      // Bind Section 3: Data Management
      if (this.btnExportBackupEl) {
        DOM.on(this.btnExportBackupEl, 'click', () => this.exportBackup());
      }
      if (this.btnTriggerRestoreEl && this.restoreFileInput) {
        DOM.on(this.btnTriggerRestoreEl, 'click', () => {
          this.restoreFileInput.value = '';
          this.restoreFileInput.click();
        });
        DOM.on(this.restoreFileInput, 'change', (e) => this.handleFileSelected(e));
      }

      // Restore Modal Actions
      if (this.btnCancelRestoreEl) {
        DOM.on(this.btnCancelRestoreEl, 'click', () => this.closeRestoreModal());
      }
      if (this.btnCloseRestoreXEl) {
        DOM.on(this.btnCloseRestoreXEl, 'click', () => this.closeRestoreModal());
      }
      if (this.btnConfirmRestoreEl) {
        DOM.on(this.btnConfirmRestoreEl, 'click', () => this.executeRestore());
      }

      // Nuclear Reset Actions
      if (this.btnNuclearResetEl) {
        DOM.on(this.btnNuclearResetEl, 'click', () => this.openResetModal());
      }
      if (this.btnCancelResetEl) {
        DOM.on(this.btnCancelResetEl, 'click', () => this.closeResetModal());
      }
      if (this.btnCloseResetXEl) {
        DOM.on(this.btnCloseResetXEl, 'click', () => this.closeResetModal());
      }
      if (this.btnConfirmResetEl) {
        DOM.on(this.btnConfirmResetEl, 'click', () => this.executeReset());
      }

      this.initialized = true;
    },

    /**
     * View activation hook
     */
    onActivate() {
      this.init();
      this.loadProfile();
      this.loadPreferences();
    },

    // =========================================================================
    // Section 1: Profile Settings
    // =========================================================================
    loadProfile() {
      const { Storage } = global.GradeMate;
      const profile = Storage.getProfile();
      if (this.userNameInput && profile && profile.name) {
        this.userNameInput.value = profile.name;
      }
    },

    saveProfile() {
      const { Storage, State, DOM } = global.GradeMate;
      const rawName = this.userNameInput ? this.userNameInput.value.trim() : '';

      if (!rawName) {
        if (this.userNameInput) this.userNameInput.classList.add('is-invalid');
        if (this.profileFeedbackEl) {
          this.profileFeedbackEl.className = 'save-feedback-banner is-error';
          this.profileFeedbackEl.textContent = 'Please enter a valid student name.';
          DOM.toggle(this.profileFeedbackEl, true);
        }
        return;
      }

      Storage.saveProfile({ name: rawName, onboarded: true });

      // Emitting profile:updated immediately updates Dashboard greeting
      State.emit('profile:updated', Storage.getProfile());

      if (this.profileFeedbackEl) {
        this.profileFeedbackEl.className = 'save-feedback-banner is-success';
        this.profileFeedbackEl.textContent = 'Profile name updated successfully. Dashboard greeting has updated.';
        DOM.toggle(this.profileFeedbackEl, true);
      }
    },

    // =========================================================================
    // Section 2: Academic Preferences
    // =========================================================================
    loadPreferences() {
      const { Storage } = global.GradeMate;
      const prefs = Storage.getPreferences();

      const scaleId = prefs.gradingSystemId || 'scale_10_standard';
      if (this.scaleSelectEl) {
        this.scaleSelectEl.value = scaleId;
        this.scaleSelectEl.dataset.prevScale = scaleId;
      }
      if (this.maxScaleInput) {
        this.maxScaleInput.value = String(prefs.maxScalePoint || 10.0);
      }
      if (this.precisionSelectEl) {
        this.precisionSelectEl.value = String(prefs.decimalPrecision || 2);
      }
      if (this.minPassGradeInput) {
        this.minPassGradeInput.value = prefs.minPassGrade || 'P';
      }

      const grades = Array.isArray(prefs.customGrades) && prefs.customGrades.length > 0
        ? prefs.customGrades
        : PRESETS.scale_10_standard.grades;

      this.renderGradeRows(grades);
    },

    /**
     * Switch grading presets while preserving user's custom definitions
     * @param {string} scaleId
     */
    handleScaleChange(scaleId) {
      const { Storage } = global.GradeMate;
      const prefs = Storage.getPreferences();

      // If switching away from Custom, save current rows to savedCustomGrades
      if (this.scaleSelectEl && this.scaleSelectEl.dataset.prevScale === 'scale_custom') {
        const currentCustom = this.gatherGradeRows();
        if (currentCustom.length > 0) {
          Storage.savePreferences({ savedCustomGrades: currentCustom });
        }
      }

      if (scaleId === 'scale_10_standard') {
        const preset = PRESETS.scale_10_standard;
        if (this.maxScaleInput) this.maxScaleInput.value = preset.maxScalePoint.toFixed(1);
        if (this.minPassGradeInput) this.minPassGradeInput.value = preset.minPassGrade;
        this.renderGradeRows(preset.grades);
      } else if (scaleId === 'scale_4_us') {
        const preset = PRESETS.scale_4_us;
        if (this.maxScaleInput) this.maxScaleInput.value = preset.maxScalePoint.toFixed(1);
        if (this.minPassGradeInput) this.minPassGradeInput.value = preset.minPassGrade;
        this.renderGradeRows(preset.grades);
      } else if (scaleId === 'scale_custom') {
        // Restore user's saved custom scale if available
        const savedCustom = prefs.savedCustomGrades || prefs.customGrades || PRESETS.scale_10_standard.grades;
        this.renderGradeRows(savedCustom);
      }

      if (this.scaleSelectEl) {
        this.scaleSelectEl.dataset.prevScale = scaleId;
      }
    },

    renderGradeRows(grades) {
      const { DOM } = global.GradeMate;
      if (!this.gradeTbodyEl) return;
      this.gradeTbodyEl.innerHTML = '';

      grades.forEach((g) => {
        const tr = document.createElement('tr');
        tr.className = 'grade-row-item';
        tr.innerHTML = `
          <td>
            <input type="text" class="form-input form-input-sm grade-letter-input" value="${DOM.escapeHTML(g.grade || '')}" placeholder="Letter" maxlength="5" aria-label="Grade letter">
          </td>
          <td>
            <input type="number" class="form-input form-input-sm grade-points-input" value="${g.points !== undefined ? g.points : ''}" placeholder="0.0" step="0.1" min="0" aria-label="Grade points">
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-outline btn-sm btn-remove-grade" aria-label="Remove grade">&times;</button>
          </td>
        `;

        const removeBtn = tr.querySelector('.btn-remove-grade');
        DOM.on(removeBtn, 'click', () => {
          if (this.gradeTbodyEl.children.length > 1) {
            tr.remove();
          }
        });

        this.gradeTbodyEl.appendChild(tr);
      });
    },

    addGradeRow() {
      if (!this.gradeTbodyEl) return;
      const { DOM } = global.GradeMate;
      const tr = document.createElement('tr');
      tr.className = 'grade-row-item';
      tr.innerHTML = `
        <td>
          <input type="text" class="form-input form-input-sm grade-letter-input" value="" placeholder="Letter" maxlength="5" aria-label="Grade letter">
        </td>
        <td>
          <input type="number" class="form-input form-input-sm grade-points-input" value="" placeholder="0.0" step="0.1" min="0" aria-label="Grade points">
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-outline btn-sm btn-remove-grade" aria-label="Remove grade">&times;</button>
        </td>
      `;

      const removeBtn = tr.querySelector('.btn-remove-grade');
      DOM.on(removeBtn, 'click', () => {
        if (this.gradeTbodyEl.children.length > 1) {
          tr.remove();
        }
      });

      this.gradeTbodyEl.appendChild(tr);
    },

    gatherGradeRows() {
      const rows = Array.from(this.gradeTbodyEl ? this.gradeTbodyEl.children : []);
      return rows.map((tr) => ({
        grade: (tr.querySelector('.grade-letter-input').value || '').trim(),
        points: parseFloat(tr.querySelector('.grade-points-input').value)
      })).filter((item) => item.grade !== '' && !isNaN(item.points));
    },

    savePreferences() {
      const { Storage, State, DOM } = global.GradeMate;
      const scaleId = this.scaleSelectEl ? this.scaleSelectEl.value : 'scale_10_standard';
      const maxScale = parseFloat(this.maxScaleInput ? this.maxScaleInput.value : '10.0');
      const precision = parseInt(this.precisionSelectEl ? this.precisionSelectEl.value : '2', 10);
      const minPass = this.minPassGradeInput ? this.minPassGradeInput.value.trim() : 'P';
      const grades = this.gatherGradeRows();

      if (isNaN(maxScale) || maxScale <= 0) {
        if (this.preferencesFeedbackEl) {
          this.preferencesFeedbackEl.className = 'save-feedback-banner is-error';
          this.preferencesFeedbackEl.textContent = 'Maximum scale point must be a positive number greater than zero.';
          DOM.toggle(this.preferencesFeedbackEl, true);
        }
        return;
      }

      if (grades.length === 0) {
        if (this.preferencesFeedbackEl) {
          this.preferencesFeedbackEl.className = 'save-feedback-banner is-error';
          this.preferencesFeedbackEl.textContent = 'Please configure at least one valid grade letter and numeric point value.';
          DOM.toggle(this.preferencesFeedbackEl, true);
        }
        return;
      }

      const updatedPrefs = {
        gradingSystemId: scaleId,
        maxScalePoint: maxScale,
        decimalPrecision: precision === 3 ? 3 : 2,
        minPassGrade: minPass || 'P',
        customGrades: grades
      };

      if (scaleId === 'scale_custom') {
        updatedPrefs.savedCustomGrades = grades;
      }

      Storage.savePreferences(updatedPrefs);

      // Emitting preferences:updated refreshes SGPA dropdowns, CGPA badge, Target badge, and Dashboard precision
      State.emit('preferences:updated', updatedPrefs);

      if (this.preferencesFeedbackEl) {
        this.preferencesFeedbackEl.className = 'save-feedback-banner is-success';
        this.preferencesFeedbackEl.textContent = 'Academic preferences saved successfully. Future calculations and displays have updated.';
        DOM.toggle(this.preferencesFeedbackEl, true);
      }
    },

    // =========================================================================
    // Section 3: Data Management (Export / Restore / Nuclear Reset)
    // =========================================================================
    exportBackup() {
      const { Storage } = global.GradeMate;
      const backupData = Storage.exportBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `grademate_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    handleFileSelected(e) {
      const file = e.target.files[0];
      if (!file) return;

      const { Storage, DOM } = global.GradeMate;
      const reader = new FileReader();

      reader.onload = (event) => {
        const rawContent = event.target.result;
        // Pre-flight schema validation
        const validation = Storage.validateBackupSchema(rawContent);

        if (!validation.valid) {
          if (this.restoreFeedbackEl) {
            this.restoreFeedbackEl.className = 'save-feedback-banner is-error';
            this.restoreFeedbackEl.textContent = `Invalid backup file: ${validation.error}. Existing data remains untouched.`;
            DOM.toggle(this.restoreFeedbackEl, true);
          }
          return;
        }

        // Valid file: store pending data and open confirmation modal
        this.pendingRestoreJson = rawContent;
        const { data } = validation;

        if (this.restorePreviewEl) {
          this.restorePreviewEl.innerHTML = `
            <div><strong>Student Profile:</strong> ${DOM.escapeHTML(data.profile ? data.profile.name : 'Unknown')}</div>
            <div><strong>SGPA Records:</strong> ${Array.isArray(data.sgpaHistory) ? data.sgpaHistory.length : 0} semesters</div>
            <div><strong>CGPA Records:</strong> ${Array.isArray(data.cgpaHistory) ? data.cgpaHistory.length : 0} calculations</div>
            <div><strong>Export Date:</strong> ${data.exportedAt ? new Date(data.exportedAt).toLocaleDateString() : 'Date unavailable'}</div>
          `;
        }

        DOM.toggle(this.restoreFeedbackEl, false);
        this.openRestoreModal();
      };

      reader.readAsText(file);
    },

    openRestoreModal() {
      if (this.modalRestoreEl) {
        this.modalRestoreEl.classList.add('is-open');
      }
    },

    closeRestoreModal() {
      if (this.modalRestoreEl) {
        this.modalRestoreEl.classList.remove('is-open');
      }
      this.pendingRestoreJson = null;
    },

    executeRestore() {
      if (!this.pendingRestoreJson) return;
      const { Storage, State, DOM } = global.GradeMate;

      const result = Storage.importBackup(this.pendingRestoreJson);
      this.closeRestoreModal();

      if (result.success) {
        // Emit events only after all 4 datasets succeeded
        State.emit('profile:updated', Storage.getProfile());
        State.emit('preferences:updated', Storage.getPreferences());
        State.emit('history:updated');

        this.loadProfile();
        this.loadPreferences();

        if (this.restoreFeedbackEl) {
          this.restoreFeedbackEl.className = 'save-feedback-banner is-success';
          this.restoreFeedbackEl.textContent = 'Backup restored successfully! All profile, history, and preferences have updated.';
          DOM.toggle(this.restoreFeedbackEl, true);
        }
      } else {
        if (this.restoreFeedbackEl) {
          this.restoreFeedbackEl.className = 'save-feedback-banner is-error';
          if (result.dataUntouched) {
            this.restoreFeedbackEl.textContent = `Restoration aborted: ${result.error}. Existing user data was left untouched.`;
          } else if (result.rolledBack) {
            this.restoreFeedbackEl.textContent = `Restoration failed: ${result.error}. Complete rollback succeeded; your original data has been safely preserved.`;
          } else {
            this.restoreFeedbackEl.textContent = `Critical failure: ${result.error}. Partial rollback occurred. Check browser storage availability.`;
          }
          DOM.toggle(this.restoreFeedbackEl, true);
        }
      }
    },

    // Nuclear Reset Flow
    openResetModal() {
      if (this.modalResetEl) {
        this.modalResetEl.classList.add('is-open');
      }
    },

    closeResetModal() {
      if (this.modalResetEl) {
        this.modalResetEl.classList.remove('is-open');
      }
    },

    executeReset() {
      this.closeResetModal();
      if (global.GradeMate.App && typeof global.GradeMate.App.executeCompleteReset === 'function') {
        global.GradeMate.App.executeCompleteReset();
      }
    },

    /**
     * Complete reset of Settings View form states
     */
    resetState() {
      if (this.userNameInput) this.userNameInput.value = '';
      if (this.profileFeedbackEl) this.profileFeedbackEl.classList.add('is-hidden');
      if (this.preferencesFeedbackEl) this.preferencesFeedbackEl.classList.add('is-hidden');
      if (this.restoreFeedbackEl) this.restoreFeedbackEl.classList.add('is-hidden');
      if (this.modalRestoreEl) this.modalRestoreEl.classList.remove('is-open');
      if (this.modalResetEl) this.modalResetEl.classList.remove('is-open');
      this.pendingRestoreJson = null;
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.Views = global.GradeMate.Views || {};
  global.GradeMate.Views.Settings = SettingsView;
})(window);
