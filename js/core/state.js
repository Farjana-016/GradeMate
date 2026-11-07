/**
 * GradeMate — Central Application State & Event Bus
 * Phase 1: Project Foundation & Design System
 */

(function (global) {
  'use strict';

  const listeners = new Map();

  const State = {
    currentView: 'dashboard',

    /**
     * Subscribe to an event
     * @param {string} event
     * @param {Function} callback
     */
    on(event, callback) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(callback);
    },

    /**
     * Unsubscribe from an event
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
      if (listeners.has(event)) {
        listeners.get(event).delete(callback);
      }
    },

    /**
     * Emit an event to all subscribers
     * @param {string} event
     * @param {*} data
     */
    emit(event, data) {
      if (listeners.has(event)) {
        listeners.get(event).forEach((cb) => {
          try {
            cb(data);
          } catch (err) {
            console.error(`[GradeMate State] Error in listener for "${event}":`, err);
          }
        });
      }
    },

    /**
     * Update current view
     * @param {string} viewName
     */
    setCurrentView(viewName) {
      this.currentView = viewName;
      this.emit('view:changed', viewName);
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.State = State;
})(window);
