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
    // History Access & Record Mutations
    // =========================================================================
    getSGPAHistory() {
      return this._getItem(STORAGE_KEYS.SGPA_HISTORY, []);
    },

    saveSGPAHistory(list) {
      return this._setItem(STORAGE_KEYS.SGPA_HISTORY, Array.isArray(list) ? list : []);
    },

    deleteSGPARecord(id) {
      const list = this.getSGPAHistory();
      const filtered = list.filter((rec) => rec.id !== id);
      const changed = filtered.length !== list.length;
      if (changed) {
        this.saveSGPAHistory(filtered);
      }
      return changed;
    },

    updateSGPARecord(id, updatedFields) {
      const list = this.getSGPAHistory();
      const idx = list.findIndex((rec) => rec.id === id);
      if (idx === -1) return false;
      const original = list[idx];
      list[idx] = {
        ...original,
        ...updatedFields,
        id: original.id,
        calculatedAt: original.calculatedAt,
        updatedAt: new Date().toISOString()
      };
      return this.saveSGPAHistory(list);
    },

    getCGPAHistory() {
      return this._getItem(STORAGE_KEYS.CGPA_HISTORY, []);
    },

    saveCGPAHistory(list) {
      return this._setItem(STORAGE_KEYS.CGPA_HISTORY, Array.isArray(list) ? list : []);
    },

    deleteCGPARecord(id) {
      const list = this.getCGPAHistory();
      const filtered = list.filter((rec) => rec.id !== id);
      const changed = filtered.length !== list.length;
      if (changed) {
        this.saveCGPAHistory(filtered);
      }
      return changed;
    },

    updateCGPARecord(id, updatedFields) {
      const list = this.getCGPAHistory();
      const idx = list.findIndex((rec) => rec.id === id);
      if (idx === -1) return false;
      const original = list[idx];
      list[idx] = {
        ...original,
        ...updatedFields,
        id: original.id,
        calculatedAt: original.calculatedAt,
        updatedAt: new Date().toISOString()
      };
      return this.saveCGPAHistory(list);
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

    validateBackupSchema(rawJson) {
      try {
        const data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        if (!data || typeof data !== 'object') {
          return { valid: false, error: 'Backup file is not a valid JSON object.' };
        }
        if (data.app !== 'GradeMate') {
          return { valid: false, error: 'Incompatible file: missing GradeMate signature.' };
        }
        if (!data.version || typeof data.version !== 'string') {
          return { valid: false, error: 'Incompatible file: missing version identifier.' };
        }
        if (!data.profile || typeof data.profile !== 'object' || typeof data.profile.name !== 'string') {
          return { valid: false, error: 'Invalid profile data structure: name string is required.' };
        }
        if (!data.preferences || typeof data.preferences !== 'object') {
          return { valid: false, error: 'Invalid preferences data structure.' };
        }
        if (!Array.isArray(data.sgpaHistory)) {
          return { valid: false, error: 'Invalid SGPA history: expected an array.' };
        }
        for (let i = 0; i < data.sgpaHistory.length; i++) {
          const rec = data.sgpaHistory[i];
          if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
            return { valid: false, error: `Invalid SGPA history at index ${i}: record must be a valid object.` };
          }
          if (!rec.id || typeof rec.id !== 'string') {
            return { valid: false, error: `Invalid SGPA history at index ${i}: missing or invalid record ID.` };
          }
          if (rec.totalCredits === undefined || rec.totalCredits === null || !Number.isFinite(Number(rec.totalCredits)) || Number(rec.totalCredits) < 0) {
            return { valid: false, error: `Invalid SGPA history at index ${i}: totalCredits must be a finite non-negative number.` };
          }
          if (rec.sgpa === undefined || rec.sgpa === null || !Number.isFinite(Number(rec.sgpa)) || Number(rec.sgpa) < 0) {
            return { valid: false, error: `Invalid SGPA history at index ${i}: sgpa must be a finite non-negative number.` };
          }
          if (rec.subjects !== undefined && !Array.isArray(rec.subjects)) {
            return { valid: false, error: `Invalid SGPA history at index ${i}: subjects must be an array when present.` };
          }
        }

        if (!Array.isArray(data.cgpaHistory)) {
          return { valid: false, error: 'Invalid CGPA history: expected an array.' };
        }
        for (let i = 0; i < data.cgpaHistory.length; i++) {
          const rec = data.cgpaHistory[i];
          if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
            return { valid: false, error: `Invalid CGPA history at index ${i}: record must be a valid object.` };
          }
          if (!rec.id || typeof rec.id !== 'string') {
            return { valid: false, error: `Invalid CGPA history at index ${i}: missing or invalid record ID.` };
          }
          if (rec.totalCredits === undefined || rec.totalCredits === null || !Number.isFinite(Number(rec.totalCredits)) || Number(rec.totalCredits) < 0) {
            return { valid: false, error: `Invalid CGPA history at index ${i}: totalCredits must be a finite non-negative number.` };
          }
          if (rec.cgpa === undefined || rec.cgpa === null || !Number.isFinite(Number(rec.cgpa)) || Number(rec.cgpa) < 0) {
            return { valid: false, error: `Invalid CGPA history at index ${i}: cgpa must be a finite non-negative number.` };
          }
          if (rec.semesters !== undefined && !Array.isArray(rec.semesters)) {
            return { valid: false, error: `Invalid CGPA history at index ${i}: semesters must be an array when present.` };
          }
        }
        return { valid: true, data };
      } catch (err) {
        return { valid: false, error: `JSON parsing error: ${err.message}` };
      }
    },

    importBackup(rawJson) {
      // 1. Complete pre-flight schema validation (zero LocalStorage writes if invalid)
      const validation = this.validateBackupSchema(rawJson);
      if (!validation.valid) {
        return { success: false, error: validation.error, dataUntouched: true };
      }

      const { data } = validation;

      // 2. Snapshot all four original LocalStorage keys before restoration
      const snapshot = {
        [STORAGE_KEYS.PROFILE]: localStorage.getItem(STORAGE_KEYS.PROFILE),
        [STORAGE_KEYS.PREFERENCES]: localStorage.getItem(STORAGE_KEYS.PREFERENCES),
        [STORAGE_KEYS.SGPA_HISTORY]: localStorage.getItem(STORAGE_KEYS.SGPA_HISTORY),
        [STORAGE_KEYS.CGPA_HISTORY]: localStorage.getItem(STORAGE_KEYS.CGPA_HISTORY)
      };

      const keysToRestore = [
        { key: STORAGE_KEYS.PROFILE, value: data.profile },
        { key: STORAGE_KEYS.PREFERENCES, value: data.preferences },
        { key: STORAGE_KEYS.SGPA_HISTORY, value: data.sgpaHistory },
        { key: STORAGE_KEYS.CGPA_HISTORY, value: data.cgpaHistory }
      ];

      let failedKey = null;
      let writeError = null;

      // 3. Staged writes
      for (const item of keysToRestore) {
        try {
          localStorage.setItem(item.key, JSON.stringify(item.value));
        } catch (err) {
          failedKey = item.key;
          writeError = err;
          break;
        }
      }

      // 4. Handle write failures with independent rollback attempts on every single key
      if (writeError) {
        const rollbackFailures = [];

        Object.entries(snapshot).forEach(([key, origValue]) => {
          try {
            if (origValue !== null) {
              localStorage.setItem(key, origValue);
            } else {
              localStorage.removeItem(key);
            }
          } catch (rbErr) {
            rollbackFailures.push({ key, error: rbErr.message });
          }
        });

        const completelyRolledBack = rollbackFailures.length === 0;

        return {
          success: false,
          error: `Storage write failed on "${failedKey}": ${writeError.message}.`,
          dataUntouched: false,
          rolledBack: completelyRolledBack,
          rollbackFailures: rollbackFailures.length > 0 ? rollbackFailures : null
        };
      }

      return { success: true };
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.Storage = Storage;
})(window);
