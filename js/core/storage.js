/**
 * GradeMate — LocalStorage Adapter & Persistence Layer
 * Phase 1: Project Foundation & Design System
 */

(function (global) {
  'use strict';

  const STORAGE_KEYS = {
    PROFILE: 'grademate_profile',
    PREFERENCES: 'grademate_preferences',
    SGPA_HISTORY: 'grademate_sgpa_history',
    CGPA_HISTORY: 'grademate_cgpa_history'
  };

  const DEFAULT_PREFERENCES = {
    decimalPrecision: 2,
    gradingSystemId: 'scale_10_standard',
    scaleConfirmedByUser: false,
    maxScalePoint: 10.0,
    minPassGrade: 'P',
    customGrades: [
      { grade: 'O', points: 10.0 },
      { grade: 'A+', points: 9.0 },
      { grade: 'A', points: 8.0 },
      { grade: 'B+', points: 7.0 },
      { grade: 'B', points: 6.0 },
      { grade: 'C', points: 5.0 },
      { grade: 'P', points: 4.0 },
      { grade: 'F', points: 0.0 }
    ]
  };

  const Storage = {
    KEYS: STORAGE_KEYS,

    /**
     * Safe LocalStorage read
     * @private
     */
    _getItem(key, fallback = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch (err) {
        console.warn(`[GradeMate Storage] Failed reading key "${key}":`, err);
        return fallback;
      }
    },

    /**
     * Safe LocalStorage write
     * @private
     */
    _setItem(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.error(`[GradeMate Storage] Failed writing key "${key}":`, err);
        return false;
      }
    },

    // =========================================================================
    // Profile Management
    // =========================================================================
    getProfile() {
      return this._getItem(STORAGE_KEYS.PROFILE, null);
    },

    saveProfile(profileData) {
      const existing = this.getProfile() || {};
      const updated = {
        name: (profileData.name || '').trim(),
        onboarded: profileData.onboarded !== undefined ? Boolean(profileData.onboarded) : true,
        createdAt: existing.createdAt || new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      return this._setItem(STORAGE_KEYS.PROFILE, updated);
    },

    isOnboarded() {
      const profile = this.getProfile();
      return Boolean(profile && profile.onboarded && profile.name && profile.name.trim().length > 0);
    },

    // =========================================================================
    // Preferences Management
    // =========================================================================
    getPreferences() {
      const saved = this._getItem(STORAGE_KEYS.PREFERENCES, null);
      if (!saved) {
        return { ...DEFAULT_PREFERENCES };
      }
      return { ...DEFAULT_PREFERENCES, ...saved };
    },

    savePreferences(prefs) {
      const current = this.getPreferences();
      const updated = { ...current, ...prefs };
      return this._setItem(STORAGE_KEYS.PREFERENCES, updated);
    },

    // =========================================================================
    // History Access
    // =========================================================================
    getSGPAHistory() {
      return this._getItem(STORAGE_KEYS.SGPA_HISTORY, []);
    },

    saveSGPAHistory(list) {
      return this._setItem(STORAGE_KEYS.SGPA_HISTORY, Array.isArray(list) ? list : []);
    },

    getCGPAHistory() {
      return this._getItem(STORAGE_KEYS.CGPA_HISTORY, []);
    },

    saveCGPAHistory(list) {
      return this._setItem(STORAGE_KEYS.CGPA_HISTORY, Array.isArray(list) ? list : []);
    },

    // =========================================================================
    // Complete App Data Wipe
    // =========================================================================
    clearAll() {
      try {
        localStorage.removeItem(STORAGE_KEYS.PROFILE);
        localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
        localStorage.removeItem(STORAGE_KEYS.SGPA_HISTORY);
        localStorage.removeItem(STORAGE_KEYS.CGPA_HISTORY);
        return true;
      } catch (err) {
        console.error('[GradeMate Storage] Error wiping storage:', err);
        return false;
      }
    },

    // =========================================================================
    // Backup & Restore
    // =========================================================================
    exportBackup() {
      return {
        app: 'GradeMate',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        profile: this.getProfile(),
        preferences: this.getPreferences(),
        sgpaHistory: this.getSGPAHistory(),
        cgpaHistory: this.getCGPAHistory()
      };
    },

    importBackup(rawJson) {
      try {
        const data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        if (!data || typeof data !== 'object') {
          return { success: false, error: 'Invalid backup file: not a JSON object.' };
        }
        if (data.app !== 'GradeMate') {
          return { success: false, error: 'Invalid backup file: missing GradeMate signature.' };
        }

        if (data.profile) this._setItem(STORAGE_KEYS.PROFILE, data.profile);
        if (data.preferences) this._setItem(STORAGE_KEYS.PREFERENCES, data.preferences);
        if (Array.isArray(data.sgpaHistory)) this._setItem(STORAGE_KEYS.SGPA_HISTORY, data.sgpaHistory);
        if (Array.isArray(data.cgpaHistory)) this._setItem(STORAGE_KEYS.CGPA_HISTORY, data.cgpaHistory);

        return { success: true };
      } catch (err) {
        return { success: false, error: `JSON parsing error: ${err.message}` };
      }
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.Storage = Storage;
})(window);
