/**
 * GradeMate — First-Time User Onboarding View
 * Phase 1: Project Foundation & Design System
 */

(function (global) {
  'use strict';

  const OnboardingView = {
    screenEl: null,
    formEl: null,
    inputEl: null,
    feedbackEl: null,

    /**
     * Initialize Onboarding View elements and events
     */
    init() {
      const { DOM, Storage, State } = global.GradeMate;

      this.screenEl = DOM.qs('#onboarding-screen');
      this.formEl = DOM.qs('#onboarding-form');
      this.inputEl = DOM.qs('#student-name-input');
      this.feedbackEl = DOM.qs('#onboarding-feedback');

      if (!this.formEl || !this.inputEl) return;

      DOM.on(this.formEl, 'submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });

      // Clear validation error on input
      DOM.on(this.inputEl, 'input', () => {
        if (this.inputEl.classList.contains('is-invalid')) {
          this.inputEl.classList.remove('is-invalid');
          if (this.feedbackEl) {
            this.feedbackEl.textContent = '';
            this.feedbackEl.classList.remove('is-error');
          }
        }
      });
    },

    /**
     * Handle onboarding submission
     */
    handleSubmit() {
      const { Storage, State } = global.GradeMate;
      const rawName = this.inputEl.value;
      const cleanName = (rawName || '').trim();

      if (!cleanName) {
        this.inputEl.classList.add('is-invalid');
        if (this.feedbackEl) {
          this.feedbackEl.textContent = 'Please enter your name to get started.';
          this.feedbackEl.classList.add('is-error');
        }
        this.inputEl.focus();
        return;
      }

      // Save profile to LocalStorage
      Storage.saveProfile({
        name: cleanName,
        onboarded: true
      });

      // Notify application state
      State.emit('profile:updated', Storage.getProfile());

      // Hide onboarding screen and reveal main app
      this.hide();

      // Switch to dashboard
      global.GradeMate.App.navigateTo('dashboard');
    },

    show() {
      if (this.screenEl) {
        this.screenEl.classList.remove('is-hidden');
      }
      const appShell = document.querySelector('.app-shell');
      if (appShell) {
        appShell.classList.add('is-hidden');
      }
      if (this.inputEl) {
        setTimeout(() => this.inputEl.focus(), 100);
      }
    },

    hide() {
      if (this.screenEl) {
        this.screenEl.classList.add('is-hidden');
      }
      const appShell = document.querySelector('.app-shell');
      if (appShell) {
        appShell.classList.remove('is-hidden');
      }
    },

    /**
     * Reset onboarding form inputs and error feedback
     */
    reset() {
      if (this.inputEl) {
        this.inputEl.value = '';
        this.inputEl.classList.remove('is-invalid');
      }
      if (this.feedbackEl) {
        this.feedbackEl.textContent = '';
        this.feedbackEl.classList.remove('is-error');
      }
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.Views = global.GradeMate.Views || {};
  global.GradeMate.Views.Onboarding = OnboardingView;
})(window);
