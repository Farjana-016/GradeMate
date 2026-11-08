/**
 * GradeMate — Application Orchestrator & SPA Router
 * Phase 1: Project Foundation & Design System
 */

(function (global) {
  'use strict';

  const App = {
    currentViewId: 'dashboard',
    validViews: ['dashboard', 'sgpa', 'cgpa', 'target', 'history', 'settings'],

    /**
     * Bootstrap the application on DOM ready
     */
    init() {
      const { DOM, Storage, State, Views } = global.GradeMate;

      // Initialize Onboarding
      if (Views.Onboarding) {
        Views.Onboarding.init();
      }

      // Initialize View Scaffolds
      Object.keys(Views).forEach((viewKey) => {
        if (viewKey !== 'Onboarding' && typeof Views[viewKey].init === 'function') {
          Views[viewKey].init();
        }
      });

      // Bind Navigation Handlers
      this.bindNavigation();

      // Check Onboarding State
      if (!Storage.isOnboarded()) {
        Views.Onboarding.show();
      } else {
        Views.Onboarding.hide();
        // Check initial hash or default to dashboard
        const initialView = this.getViewFromHash() || 'dashboard';
        this.navigateTo(initialView, false);
      }

      // Listen to window hash changes (supports back/forward buttons)
      DOM.on(window, 'hashchange', () => {
        if (Storage.isOnboarded()) {
          const target = this.getViewFromHash();
          if (target && target !== this.currentViewId) {
            this.navigateTo(target, false);
          }
        }
      });

      // Listen for profile changes to update greeting/UI dynamically
      State.on('profile:updated', (profile) => {
        if (this.currentViewId === 'dashboard' && Views.Dashboard) {
          Views.Dashboard.onActivate();
        }
      });
    },

    /**
     * Get view identifier from URL hash
     * @returns {string|null}
     */
    getViewFromHash() {
      const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
      return this.validViews.includes(hash) ? hash : null;
    },

    /**
     * Bind click events for navigation links and mobile toggle
     */
    bindNavigation() {
      const { DOM } = global.GradeMate;

      // Navigation links (desktop header & mobile fixed bottom nav)
      const navLinks = DOM.qsa('.nav-link, .bottom-nav-link');
      navLinks.forEach((link) => {
        DOM.on(link, 'click', (e) => {
          e.preventDefault();
          const viewTarget = link.getAttribute('data-target-view');
          if (viewTarget) {
            this.navigateTo(viewTarget);
          }
        });
      });

      // Logo click returns to dashboard
      const brandLogo = DOM.qs('#brand-logo');
      if (brandLogo) {
        DOM.on(brandLogo, 'click', (e) => {
          e.preventDefault();
          if (global.GradeMate.Storage.isOnboarded()) {
            this.navigateTo('dashboard');
          }
        });
      }

      // Mobile Menu Toggle
      const navToggle = DOM.qs('#nav-toggle');
      const mainNav = DOM.qs('#main-nav');
      if (navToggle && mainNav) {
        DOM.on(navToggle, 'click', () => {
          const isOpen = mainNav.classList.toggle('is-open');
          navToggle.setAttribute('aria-expanded', String(isOpen));
          navToggle.textContent = isOpen ? 'Close Menu' : 'Menu';
        });
      }
    },

    /**
     * Seamlessly transition to a target view without page reload
     * @param {string} viewId
     * @param {boolean} [updateHash=true]
     */
    navigateTo(viewId, updateHash = true) {
      if (!this.validViews.includes(viewId)) {
        viewId = 'dashboard';
      }

      const { DOM, State, Views } = global.GradeMate;
      this.currentViewId = viewId;

      // Update URL hash without causing a page jump
      if (updateHash && window.location.hash !== `#${viewId}`) {
        window.history.pushState(null, '', `#${viewId}`);
      }

      // Update Navigation Active States (both desktop header & mobile fixed bottom nav)
      const navLinks = DOM.qsa('.nav-link, .bottom-nav-link');
      navLinks.forEach((link) => {
        const isMatch = link.getAttribute('data-target-view') === viewId;
        link.classList.toggle('active', isMatch);
        link.setAttribute('aria-selected', String(isMatch));
      });

      // Close mobile menu if open
      const mainNav = DOM.qs('#main-nav');
      const navToggle = DOM.qs('#nav-toggle');
      if (mainNav && mainNav.classList.contains('is-open')) {
        mainNav.classList.remove('is-open');
        if (navToggle) {
          navToggle.setAttribute('aria-expanded', 'false');
          navToggle.textContent = 'Menu';
        }
      }

      // Update View Panels visibility
      const panels = DOM.qsa('.view-panel');
      panels.forEach((panel) => {
        const panelId = panel.id.replace('view-', '');
        panel.classList.toggle('active', panelId === viewId);
      });

      // Scroll to top of content
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Notify application state
      State.setCurrentView(viewId);

      // Invoke onActivate hook on the active view module
      const viewMap = {
        dashboard: Views.Dashboard,
        sgpa: Views.SGPA,
        cgpa: Views.CGPA,
        target: Views.Target,
        history: Views.History,
        settings: Views.Settings
      };

      const activeModule = viewMap[viewId];
      if (activeModule && typeof activeModule.onActivate === 'function') {
        activeModule.onActivate();
      }
    },

    /**
     * Complete nuclear application reset coordinator
     * Wipes storage, clears in-memory and DOM states across all views,
     * strips URL hash, closes all modals, and returns to pristine onboarding.
     */
    executeCompleteReset() {
      const { Storage, Views } = global.GradeMate;

      // 1. Wipe all physical LocalStorage keys
      Storage.clearAll();

      // 2. Reset SGPA View inputs, rows, and result panel
      if (Views.SGPA && typeof Views.SGPA.handleReset === 'function') {
        Views.SGPA.handleReset();
      }

      // 3. Reset CGPA View inputs, rows, and result panel
      if (Views.CGPA && typeof Views.CGPA.handleReset === 'function') {
        Views.CGPA.handleReset();
      }

      // 4. Reset Target View inputs, validation, and result panel
      if (Views.Target && typeof Views.Target.handleReset === 'function') {
        Views.Target.handleReset();
      }

      // 5. Reset History View rendered lists, search query, and sort select
      if (Views.History && typeof Views.History.resetState === 'function') {
        Views.History.resetState();
      }

      // 6. Reset Settings View form inputs and status alerts
      if (Views.Settings && typeof Views.Settings.resetState === 'function') {
        Views.Settings.resetState();
      }

      // 7. Re-render Dashboard View to pristine empty state
      if (Views.Dashboard && typeof Views.Dashboard.render === 'function') {
        Views.Dashboard.render();
      }

      // 8. Strip URL hash cleanly without creating navigation history clutter
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        window.location.hash = '';
      }

      // 9. Reset Onboarding input fields and error states
      if (Views.Onboarding && typeof Views.Onboarding.reset === 'function') {
        Views.Onboarding.reset();
      }

      // 10. Close all open modal overlays
      const openModals = document.querySelectorAll('.modal-overlay.is-open');
      openModals.forEach((modal) => modal.classList.remove('is-open'));

      // 11. Reveal pristine first-time onboarding screen
      if (Views.Onboarding && typeof Views.Onboarding.show === 'function') {
        Views.Onboarding.show();
      }
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.App = App;

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }
})(window);
