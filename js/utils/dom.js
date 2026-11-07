/**
 * GradeMate — DOM Utility Functions
 * Phase 1: Project Foundation & Design System
 */

(function (global) {
  'use strict';

  const DOM = {
    /**
     * Query single element
     * @param {string} selector
     * @param {Element|Document} [context=document]
     * @returns {Element|null}
     */
    qs(selector, context = document) {
      return context.querySelector(selector);
    },

    /**
     * Query all elements as an Array
     * @param {string} selector
     * @param {Element|Document} [context=document]
     * @returns {Element[]}
     */
    qsa(selector, context = document) {
      return Array.from(context.querySelectorAll(selector));
    },

    /**
     * Attach an event listener with error boundary
     * @param {Element} element
     * @param {string} event
     * @param {Function} handler
     * @param {object} [options]
     */
    on(element, event, handler, options) {
      if (element && typeof handler === 'function') {
        element.addEventListener(event, handler, options);
      }
    },

    /**
     * Safely escape HTML to prevent XSS
     * @param {string} str
     * @returns {string}
     */
    escapeHTML(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /**
     * Toggle visibility of an element
     * @param {Element} element
     * @param {boolean} show
     */
    toggle(element, show) {
      if (element) {
        if (show) {
          element.classList.remove('is-hidden');
        } else {
          element.classList.add('is-hidden');
        }
      }
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.DOM = DOM;
})(window);
