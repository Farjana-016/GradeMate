/**
 * GradeMate — Dashboard View Controller
 * Phase 2: Dynamic Greeting, Four Metric Summary Cards & Quick Action Shortcuts
 */

(function (global) {
  'use strict';

  const DashboardView = {
    initialized: false,

    /**
     * Initialize Dashboard listeners and bindings
     */
    init() {
      if (this.initialized) return;
      const { DOM, State } = global.GradeMate;

      // Bind Shortcut Buttons
      const shortcutBtns = DOM.qsa('.btn-shortcut');
      shortcutBtns.forEach((btn) => {
        DOM.on(btn, 'click', (e) => {
          e.preventDefault();
          const targetView = btn.getAttribute('data-target-view');
          if (targetView && global.GradeMate.App) {
            global.GradeMate.App.navigateTo(targetView);
          }
        });
      });

      // Bind Recalculate CGPA Alert Button
      const recalBtn = DOM.qs('#btn-recalculate-cgpa');
      if (recalBtn) {
        DOM.on(recalBtn, 'click', (e) => {
          e.preventDefault();
          if (global.GradeMate.App) {
            global.GradeMate.App.navigateTo('cgpa');
          }
        });
      }

      // Automatically re-render dashboard when state changes
      State.on('profile:updated', () => this.render());
      State.on('history:updated', () => this.render());
      State.on('preferences:updated', () => this.render());

      this.initialized = true;
    },

    /**
     * View activation hook
     */
    onActivate() {
      this.init();
      this.render();
    },

    /**
     * Render the entire dashboard with real-time derived values
     */
    render() {
      const { DOM, Storage, TimeUtils, Calculations } = global.GradeMate;

      // 1. Personalized Greeting
      const profile = Storage.getProfile();
      const greetingEl = DOM.qs('#dashboard-greeting-text');
      if (greetingEl) {
        greetingEl.textContent = TimeUtils.formatGreeting(profile ? profile.name : '');
      }

      // Get preferences for decimal precision
      const prefs = Storage.getPreferences();
      const precision = typeof prefs.decimalPrecision === 'number' ? prefs.decimalPrecision : 2;

      // Get History Datasets
      const sgpaHistory = Storage.getSGPAHistory() || [];
      const cgpaHistory = Storage.getCGPAHistory() || [];

      // Render Each Card
      this.renderCurrentCGPA(cgpaHistory, sgpaHistory, precision);
      this.renderLatestSGPA(sgpaHistory, precision);
      this.renderHighestSGPA(sgpaHistory, precision);
      this.renderSemestersCompleted(sgpaHistory);
    },

    /**
     * Render Card 1: Current CGPA
     * Rules:
     * - Latest saved CGPA calculation is primary.
     * - If no CGPA calculation exists, derive credit-weighted average from saved SGPAs.
     * - Show recalculation alert if newer SGPA records exist after the latest CGPA calculation.
     */
    renderCurrentCGPA(cgpaHistory, sgpaHistory, precision) {
      const { DOM, Calculations } = global.GradeMate;
      const valueEl = DOM.qs('#metric-current-cgpa');
      const noteEl = DOM.qs('#metric-cgpa-note');
      const alertEl = DOM.qs('#cgpa-recalculate-notice');

      if (!valueEl || !noteEl) return;

      // Case A: Saved CGPA records exist
      if (Array.isArray(cgpaHistory) && cgpaHistory.length > 0) {
        // Sort descending by calculation date to get latest
        const sortedCgpa = [...cgpaHistory].sort((a, b) => {
          return new Date(b.calculatedAt || 0) - new Date(a.calculatedAt || 0);
        });
        const latestCgpa = sortedCgpa[0];
        const latestCgpaDate = new Date(latestCgpa.calculatedAt || 0);

        valueEl.textContent = Calculations.formatPrecision(latestCgpa.cgpa, precision);
        valueEl.classList.remove('is-empty');
        noteEl.textContent = latestCgpa.title 
          ? `${latestCgpa.title} (${latestCgpa.semesterCount || 0} sem)`
          : `Saved calculation • ${latestCgpa.totalCredits || 0} total credits`;

        // Check if newer SGPA records exist after this CGPA was calculated
        const hasNewerSgpa = sgpaHistory.some((sgpaRecord) => {
          const sgpaDate = new Date(sgpaRecord.calculatedAt || sgpaRecord.updatedAt || 0);
          return sgpaDate > latestCgpaDate;
        });

        if (alertEl) {
          DOM.toggle(alertEl, hasNewerSgpa);
        }
        return;
      }

      // Hide recalculation alert if no saved CGPA exists
      if (alertEl) {
        DOM.toggle(alertEl, false);
      }

      // Case B: No saved CGPA, but saved SGPA records exist (derive credit-weighted average)
      if (Array.isArray(sgpaHistory) && sgpaHistory.length > 0) {
        let totalCredits = 0;
        let weightedTotal = 0;

        sgpaHistory.forEach((rec) => {
          const cred = Number(rec.totalCredits) || 0;
          const sgpa = Number(rec.sgpa) || 0;
          if (cred > 0) {
            totalCredits += cred;
            weightedTotal += sgpa * cred;
          }
        });

        if (totalCredits > 0) {
          const derivedCgpa = weightedTotal / totalCredits;
          valueEl.textContent = Calculations.formatPrecision(derivedCgpa, precision);
          valueEl.classList.remove('is-empty');
          noteEl.textContent = `Derived from ${sgpaHistory.length} saved SGPA ${sgpaHistory.length === 1 ? 'record' : 'records'}`;
          return;
        }
      }

      // Case C: Completely Empty State
      valueEl.textContent = '--';
      valueEl.classList.add('is-empty');
      noteEl.textContent = 'No calculations yet';
    },

    /**
     * Render Card 2: Latest SGPA
     */
    renderLatestSGPA(sgpaHistory, precision) {
      const { DOM, Calculations } = global.GradeMate;
      const valueEl = DOM.qs('#metric-latest-sgpa');
      const noteEl = DOM.qs('#metric-latest-sgpa-note');

      if (!valueEl || !noteEl) return;

      if (Array.isArray(sgpaHistory) && sgpaHistory.length > 0) {
        // Sort descending by date
        const sorted = [...sgpaHistory].sort((a, b) => {
          return new Date(b.calculatedAt || 0) - new Date(a.calculatedAt || 0);
        });
        const latest = sorted[0];

        valueEl.textContent = Calculations.formatPrecision(latest.sgpa, precision);
        valueEl.classList.remove('is-empty');
        noteEl.textContent = `${latest.semester || 'Semester'} • ${latest.totalCredits || 0} credits`;
      } else {
        valueEl.textContent = '--';
        valueEl.classList.add('is-empty');
        noteEl.textContent = 'No semesters recorded';
      }
    },

    /**
     * Render Card 3: Highest SGPA
     */
    renderHighestSGPA(sgpaHistory, precision) {
      const { DOM, Calculations } = global.GradeMate;
      const valueEl = DOM.qs('#metric-highest-sgpa');
      const noteEl = DOM.qs('#metric-highest-sgpa-note');

      if (!valueEl || !noteEl) return;

      if (Array.isArray(sgpaHistory) && sgpaHistory.length > 0) {
        let highest = sgpaHistory[0];
        for (let i = 1; i < sgpaHistory.length; i++) {
          if ((Number(sgpaHistory[i].sgpa) || 0) > (Number(highest.sgpa) || 0)) {
            highest = sgpaHistory[i];
          }
        }

        valueEl.textContent = Calculations.formatPrecision(highest.sgpa, precision);
        valueEl.classList.remove('is-empty');
        noteEl.textContent = `Peak: ${highest.semester || 'Semester'} (${highest.sgpa})`;
      } else {
        valueEl.textContent = '--';
        valueEl.classList.add('is-empty');
        noteEl.textContent = 'No semesters recorded';
      }
    },

    /**
     * Render Card 4: Semesters Completed
     * Rules: Deduplicate unique semester identifiers so recalculating or saving revisions
     * never double-counts the same semester.
     */
    renderSemestersCompleted(sgpaHistory) {
      const { DOM } = global.GradeMate;
      const valueEl = DOM.qs('#metric-semesters-count');
      const noteEl = DOM.qs('#metric-semesters-note');

      if (!valueEl || !noteEl) return;

      if (Array.isArray(sgpaHistory) && sgpaHistory.length > 0) {
        const uniqueKeys = new Set();

        sgpaHistory.forEach((rec) => {
          if (rec.semester && typeof rec.semester === 'string' && rec.semester.trim()) {
            uniqueKeys.add(rec.semester.trim().toLowerCase());
          } else if (rec.semesterNumber) {
            uniqueKeys.add(`sem_${rec.semesterNumber}`);
          } else if (rec.id) {
            uniqueKeys.add(rec.id);
          }
        });

        const count = uniqueKeys.size;
        valueEl.textContent = String(count);
        valueEl.classList.remove('is-empty');
        noteEl.textContent = `${count} unique ${count === 1 ? 'semester' : 'semesters'} recorded`;
      } else {
        valueEl.textContent = '0';
        valueEl.classList.remove('is-empty');
        noteEl.textContent = 'Start by calculating semester 1';
      }
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.Views = global.GradeMate.Views || {};
  global.GradeMate.Views.Dashboard = DashboardView;
})(window);
