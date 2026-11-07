/**
 * GradeMate — Calculation History View Controller
 * Phase 6: Dual-Tab SGPA & CGPA History, Search, Multi-Criteria Sort, Details & In-Modal Editing
 */

(function (global) {
  'use strict';

  const HistoryView = {
    initialized: false,
    activeTab: 'sgpa', // 'sgpa' | 'cgpa'
    searchQuery: '',
    sortCriteria: 'date-desc',

    // Modal state
    currentModalType: null, // 'detail' | 'edit' | 'delete'
    activeRecord: null,
    activeRecordType: null, // 'sgpa' | 'cgpa'

    // DOM Elements
    containerEl: null,
    tabBtnSgpaEl: null,
    tabBtnCgpaEl: null,
    panelSgpaEl: null,
    panelCgpaEl: null,
    listSgpaEl: null,
    listCgpaEl: null,
    emptySgpaEl: null,
    emptyCgpaEl: null,
    searchInputEl: null,
    sortSelectEl: null,

    // Detail Modal Elements
    modalDetailEl: null,
    detailTitleEl: null,
    detailDateEl: null,
    detailStatsEl: null,
    detailTheadEl: null,
    detailTbodyEl: null,
    btnCloseDetailModalEl: null,
    btnCloseDetailXEl: null,

    // Edit Modal Elements
    modalEditEl: null,
    editTitleEl: null,
    editDateEl: null,
    editRecordTitleInputEl: null,
    editRecordTitleLabelEl: null,
    editItemsHeadingEl: null,
    editItemsContainerEl: null,
    btnAddEditItemEl: null,
    editValidationBoxEl: null,
    editValidationListEl: null,
    editSummaryStatsEl: null,
    btnCancelEditEl: null,
    btnSaveEditEl: null,
    btnCloseEditXEl: null,

    // Delete Modal Elements
    modalDeleteEl: null,
    deletePreviewEl: null,
    btnCancelDeleteEl: null,
    btnConfirmDeleteEl: null,
    btnCloseDeleteXEl: null,

    /**
     * Initialize History View DOM elements and event listeners
     */
    init() {
      if (this.initialized) return;
      const { DOM, State } = global.GradeMate;

      this.containerEl = DOM.qs('#view-history');
      if (!this.containerEl) return;

      this.tabBtnSgpaEl = DOM.qs('#tab-btn-sgpa', this.containerEl);
      this.tabBtnCgpaEl = DOM.qs('#tab-btn-cgpa', this.containerEl);
      this.panelSgpaEl = DOM.qs('#panel-history-sgpa', this.containerEl);
      this.panelCgpaEl = DOM.qs('#panel-history-cgpa', this.containerEl);
      this.listSgpaEl = DOM.qs('#history-sgpa-list', this.containerEl);
      this.listCgpaEl = DOM.qs('#history-cgpa-list', this.containerEl);
      this.emptySgpaEl = DOM.qs('#history-sgpa-empty', this.containerEl);
      this.emptyCgpaEl = DOM.qs('#history-cgpa-empty', this.containerEl);
      this.searchInputEl = DOM.qs('#history-search-input', this.containerEl);
      this.sortSelectEl = DOM.qs('#history-sort-select', this.containerEl);

      // Detail Modal References
      this.modalDetailEl = DOM.qs('#modal-history-detail');
      this.detailTitleEl = DOM.qs('#detail-modal-title');
      this.detailDateEl = DOM.qs('#detail-modal-date');
      this.detailStatsEl = DOM.qs('#detail-modal-stats');
      this.detailTheadEl = DOM.qs('#detail-modal-thead');
      this.detailTbodyEl = DOM.qs('#detail-modal-tbody');
      this.btnCloseDetailModalEl = DOM.qs('#btn-close-detail-modal');
      this.btnCloseDetailXEl = DOM.qs('#btn-close-detail-x');

      // Edit Modal References
      this.modalEditEl = DOM.qs('#modal-history-edit');
      this.editTitleEl = DOM.qs('#edit-modal-title');
      this.editDateEl = DOM.qs('#edit-modal-date');
      this.editRecordTitleInputEl = DOM.qs('#edit-record-title-input');
      this.editRecordTitleLabelEl = DOM.qs('#edit-record-title-label');
      this.editItemsHeadingEl = DOM.qs('#edit-items-heading');
      this.editItemsContainerEl = DOM.qs('#edit-items-container');
      this.btnAddEditItemEl = DOM.qs('#btn-add-edit-item');
      this.editValidationBoxEl = DOM.qs('#edit-validation-box');
      this.editValidationListEl = DOM.qs('#edit-validation-list');
      this.editSummaryStatsEl = DOM.qs('#edit-summary-stats');
      this.btnCancelEditEl = DOM.qs('#btn-cancel-edit');
      this.btnSaveEditEl = DOM.qs('#btn-save-edit');
      this.btnCloseEditXEl = DOM.qs('#btn-close-edit-x');

      // Delete Modal References
      this.modalDeleteEl = DOM.qs('#modal-history-delete');
      this.deletePreviewEl = DOM.qs('#delete-record-preview');
      this.btnCancelDeleteEl = DOM.qs('#btn-cancel-delete');
      this.btnConfirmDeleteEl = DOM.qs('#btn-confirm-delete');
      this.btnCloseDeleteXEl = DOM.qs('#btn-close-delete-x');

      // Tab switching bindings
      if (this.tabBtnSgpaEl) {
        DOM.on(this.tabBtnSgpaEl, 'click', () => this.switchTab('sgpa'));
      }
      if (this.tabBtnCgpaEl) {
        DOM.on(this.tabBtnCgpaEl, 'click', () => this.switchTab('cgpa'));
      }

      // Search and Sort bindings
      if (this.searchInputEl) {
        DOM.on(this.searchInputEl, 'input', (e) => {
          this.searchQuery = (e.target.value || '').trim().toLowerCase();
          this.render();
        });
      }
      if (this.sortSelectEl) {
        DOM.on(this.sortSelectEl, 'change', (e) => {
          this.sortCriteria = e.target.value;
          this.render();
        });
      }

      // Detail Modal Closing
      if (this.btnCloseDetailModalEl) {
        DOM.on(this.btnCloseDetailModalEl, 'click', () => this.closeDetailModal());
      }
      if (this.btnCloseDetailXEl) {
        DOM.on(this.btnCloseDetailXEl, 'click', () => this.closeDetailModal());
      }

      // Edit Modal Actions
      if (this.btnAddEditItemEl) {
        DOM.on(this.btnAddEditItemEl, 'click', () => this.addEditItemRow());
      }
      if (this.btnCancelEditEl) {
        DOM.on(this.btnCancelEditEl, 'click', () => this.closeEditModal());
      }
      if (this.btnCloseEditXEl) {
        DOM.on(this.btnCloseEditXEl, 'click', () => this.closeEditModal());
      }
      if (this.btnSaveEditEl) {
        DOM.on(this.btnSaveEditEl, 'click', () => this.saveEditRecord());
      }

      // Delete Modal Actions
      if (this.btnCancelDeleteEl) {
        DOM.on(this.btnCancelDeleteEl, 'click', () => this.closeDeleteModal());
      }
      if (this.btnCloseDeleteXEl) {
        DOM.on(this.btnCloseDeleteXEl, 'click', () => this.closeDeleteModal());
      }
      if (this.btnConfirmDeleteEl) {
        DOM.on(this.btnConfirmDeleteEl, 'click', () => this.confirmDeleteRecord());
      }

      // State subscription: re-render history when records change
      State.on('history:updated', () => {
        if (State.currentView === 'history') {
          this.render();
        }
      });

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
     * Switch active tab between 'sgpa' and 'cgpa'
     * @param {'sgpa'|'cgpa'} tab
     */
    switchTab(tab) {
      this.activeTab = tab;
      const isSgpa = tab === 'sgpa';

      if (this.tabBtnSgpaEl) {
        this.tabBtnSgpaEl.classList.toggle('is-active', isSgpa);
        this.tabBtnSgpaEl.setAttribute('aria-selected', String(isSgpa));
      }
      if (this.tabBtnCgpaEl) {
        this.tabBtnCgpaEl.classList.toggle('is-active', !isSgpa);
        this.tabBtnCgpaEl.setAttribute('aria-selected', String(!isSgpa));
      }

      const { DOM } = global.GradeMate;
      if (this.panelSgpaEl) DOM.toggle(this.panelSgpaEl, isSgpa);
      if (this.panelCgpaEl) DOM.toggle(this.panelCgpaEl, !isSgpa);

      this.render();
    },

    /**
     * Format a record timestamp safely without artificial date injection
     * @param {object} record
     * @returns {string}
     */
    formatRecordDate(record) {
      const rawDate = record.calculatedAt || record.updatedAt;
      if (!rawDate) return 'Date unavailable';
      const parsed = new Date(rawDate);
      if (isNaN(parsed.getTime())) return 'Date unavailable';

      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      return parsed.toLocaleDateString(undefined, options);
    },

    /**
     * Filter and sort records
     * @param {Array} records
     * @param {'sgpa'|'cgpa'} type
     * @returns {Array}
     */
    filterAndSort(records, type) {
      if (!Array.isArray(records)) return [];

      // 1. Text Filter
      const q = this.searchQuery;
      let filtered = records.filter((rec) => {
        if (!q) return true;
        if (type === 'sgpa') {
          return (rec.semester || '').toLowerCase().includes(q) ||
            (Array.isArray(rec.subjects) && rec.subjects.some((s) => (s.name || '').toLowerCase().includes(q)));
        } else {
          return (rec.title || '').toLowerCase().includes(q) ||
            (Array.isArray(rec.semesters) && rec.semesters.some((s) => (s.semester || '').toLowerCase().includes(q)));
        }
      });

      // 2. Sort
      const criteria = this.sortCriteria;
      filtered.sort((a, b) => {
        // Date sort: records without valid dates sort consistently to the bottom
        if (criteria === 'date-desc' || criteria === 'date-asc') {
          const dateA = a.calculatedAt || a.updatedAt;
          const dateB = b.calculatedAt || b.updatedAt;
          const timeA = dateA && !isNaN(new Date(dateA).getTime()) ? new Date(dateA).getTime() : null;
          const timeB = dateB && !isNaN(new Date(dateB).getTime()) ? new Date(dateB).getTime() : null;

          if (timeA === null && timeB === null) return 0;
          if (timeA === null) return 1; // missing goes to bottom
          if (timeB === null) return -1;

          return criteria === 'date-desc' ? timeB - timeA : timeA - timeB;
        }

        // Score sort (SGPA or CGPA)
        if (criteria === 'score-desc' || criteria === 'score-asc') {
          const scoreA = Number(type === 'sgpa' ? a.sgpa : a.cgpa) || 0;
          const scoreB = Number(type === 'sgpa' ? b.sgpa : b.cgpa) || 0;
          return criteria === 'score-desc' ? scoreB - scoreA : scoreA - scoreB;
        }

        // Title sort (A-Z)
        if (criteria === 'name-asc') {
          const nameA = (type === 'sgpa' ? a.semester : a.title) || '';
          const nameB = (type === 'sgpa' ? b.semester : b.title) || '';
          return nameA.localeCompare(nameB);
        }

        return 0;
      });

      return filtered;
    },

    /**
     * Render the active tab content
     */
    render() {
      const { Storage } = global.GradeMate;
      if (this.activeTab === 'sgpa') {
        const rawHistory = Storage.getSGPAHistory() || [];
        const processed = this.filterAndSort(rawHistory, 'sgpa');
        this.renderSgpaCards(processed, rawHistory.length);
      } else {
        const rawHistory = Storage.getCGPAHistory() || [];
        const processed = this.filterAndSort(rawHistory, 'cgpa');
        this.renderCgpaCards(processed, rawHistory.length);
      }
    },

    /**
     * Render SGPA record cards
     * @param {Array} records
     * @param {number} totalUnfiltered
     */
    renderSgpaCards(records, totalUnfiltered) {
      const { DOM, Calculations, Storage } = global.GradeMate;
      const precision = Storage.getPreferences().decimalPrecision || 2;

      if (!this.listSgpaEl) return;
      this.listSgpaEl.innerHTML = '';

      if (totalUnfiltered === 0) {
        DOM.toggle(this.emptySgpaEl, true);
        return;
      }
      DOM.toggle(this.emptySgpaEl, false);

      if (records.length === 0) {
        this.listSgpaEl.innerHTML = `<div class="history-empty-search"><p>No SGPA records match "${DOM.escapeHTML(this.searchQuery)}".</p></div>`;
        return;
      }

      records.forEach((rec) => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.setAttribute('data-record-id', rec.id);

        const dateStr = this.formatRecordDate(rec);
        const subCount = Array.isArray(rec.subjects) ? rec.subjects.length : 0;
        const sgpaFormatted = Calculations.formatPrecision(rec.sgpa, precision);

        card.innerHTML = `
          <div class="history-card-header">
            <h3 class="history-card-title">${DOM.escapeHTML(rec.semester || 'Semester')}</h3>
            <span class="history-card-badge">${sgpaFormatted} SGPA</span>
          </div>
          <div class="history-card-meta">
            <span class="meta-item">Credits: <strong>${rec.totalCredits}</strong></span>
            <span class="meta-item">Subjects: <strong>${subCount}</strong></span>
            <span class="meta-item">Points: <strong>${Calculations.formatPrecision(rec.totalPoints, 2)}</strong></span>
            <span class="meta-item">${dateStr}</span>
          </div>
          <div class="history-card-actions">
            <button type="button" class="btn btn-outline btn-sm btn-view-detail" data-id="${rec.id}" data-type="sgpa">View Details</button>
            <button type="button" class="btn btn-secondary btn-sm btn-edit-record" data-id="${rec.id}" data-type="sgpa">Edit Record</button>
            <button type="button" class="btn btn-danger btn-sm btn-delete-record" data-id="${rec.id}" data-type="sgpa">Delete</button>
          </div>
        `;

        // Bind Card Actions
        const viewBtn = card.querySelector('.btn-view-detail');
        const editBtn = card.querySelector('.btn-edit-record');
        const delBtn = card.querySelector('.btn-delete-record');

        DOM.on(viewBtn, 'click', () => this.openDetailModal('sgpa', rec.id));
        DOM.on(editBtn, 'click', () => this.openEditModal('sgpa', rec.id));
        DOM.on(delBtn, 'click', () => this.openDeleteModal('sgpa', rec.id));

        this.listSgpaEl.appendChild(card);
      });
    },

    /**
     * Render CGPA record cards
     * @param {Array} records
     * @param {number} totalUnfiltered
     */
    renderCgpaCards(records, totalUnfiltered) {
      const { DOM, Calculations, Storage } = global.GradeMate;
      const precision = Storage.getPreferences().decimalPrecision || 2;

      if (!this.listCgpaEl) return;
      this.listCgpaEl.innerHTML = '';

      if (totalUnfiltered === 0) {
        DOM.toggle(this.emptyCgpaEl, true);
        return;
      }
      DOM.toggle(this.emptyCgpaEl, false);

      if (records.length === 0) {
        this.listCgpaEl.innerHTML = `<div class="history-empty-search"><p>No CGPA records match "${DOM.escapeHTML(this.searchQuery)}".</p></div>`;
        return;
      }

      records.forEach((rec) => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.setAttribute('data-record-id', rec.id);

        const dateStr = this.formatRecordDate(rec);
        const semCount = rec.semesterCount || (Array.isArray(rec.semesters) ? rec.semesters.length : 0);
        const cgpaFormatted = Calculations.formatPrecision(rec.cgpa, precision);

        card.innerHTML = `
          <div class="history-card-header">
            <h3 class="history-card-title">${DOM.escapeHTML(rec.title || 'Cumulative CGPA')}</h3>
            <span class="history-card-badge">${cgpaFormatted} CGPA</span>
          </div>
          <div class="history-card-meta">
            <span class="meta-item">Credits: <strong>${rec.totalCredits}</strong></span>
            <span class="meta-item">Semesters: <strong>${semCount}</strong></span>
            <span class="meta-item">Weighted Points: <strong>${Calculations.formatPrecision(rec.totalPoints, 2)}</strong></span>
            <span class="meta-item">${dateStr}</span>
          </div>
          <div class="history-card-actions">
            <button type="button" class="btn btn-outline btn-sm btn-view-detail" data-id="${rec.id}" data-type="cgpa">View Details</button>
            <button type="button" class="btn btn-secondary btn-sm btn-edit-record" data-id="${rec.id}" data-type="cgpa">Edit Record</button>
            <button type="button" class="btn btn-danger btn-sm btn-delete-record" data-id="${rec.id}" data-type="cgpa">Delete</button>
          </div>
        `;

        const viewBtn = card.querySelector('.btn-view-detail');
        const editBtn = card.querySelector('.btn-edit-record');
        const delBtn = card.querySelector('.btn-delete-record');

        DOM.on(viewBtn, 'click', () => this.openDetailModal('cgpa', rec.id));
        DOM.on(editBtn, 'click', () => this.openEditModal('cgpa', rec.id));
        DOM.on(delBtn, 'click', () => this.openDeleteModal('cgpa', rec.id));

        this.listCgpaEl.appendChild(card);
      });
    },

    // =========================================================================
    // View Details Modal
    // =========================================================================
    openDetailModal(type, id) {
      const { Storage, Calculations, DOM } = global.GradeMate;
      const precision = Storage.getPreferences().decimalPrecision || 2;
      const list = type === 'sgpa' ? Storage.getSGPAHistory() : Storage.getCGPAHistory();
      const rec = list.find((item) => item.id === id);
      if (!rec) return;

      this.activeRecord = rec;
      this.activeRecordType = type;

      const dateStr = this.formatRecordDate(rec);
      if (this.detailDateEl) this.detailDateEl.textContent = `Calculated: ${dateStr}`;

      if (type === 'sgpa') {
        if (this.detailTitleEl) this.detailTitleEl.textContent = `${rec.semester || 'Semester'} SGPA Details`;
        if (this.detailStatsEl) {
          this.detailStatsEl.innerHTML = `
            <div class="modal-stat-card">
              <span class="modal-stat-label">SGPA</span>
              <span class="modal-stat-val">${Calculations.formatPrecision(rec.sgpa, precision)}</span>
            </div>
            <div class="modal-stat-card">
              <span class="modal-stat-label">Total Credits</span>
              <span class="modal-stat-val">${rec.totalCredits}</span>
            </div>
            <div class="modal-stat-card">
              <span class="modal-stat-label">Total Points</span>
              <span class="modal-stat-val">${Calculations.formatPrecision(rec.totalPoints, 2)}</span>
            </div>
          `;
        }

        if (this.detailTheadEl) {
          this.detailTheadEl.innerHTML = `
            <tr>
              <th>#</th>
              <th>Subject Name</th>
              <th>Credits</th>
              <th>Grade</th>
              <th>Grade Points</th>
              <th>Total Points</th>
            </tr>
          `;
        }

        if (this.detailTbodyEl) {
          const subjects = Array.isArray(rec.subjects) ? rec.subjects : [];
          this.detailTbodyEl.innerHTML = subjects.map((sub, idx) => {
            const pts = Number(sub.points) || 0;
            const cred = Number(sub.credits) || 0;
            const subTotal = (pts * cred).toFixed(2);
            return `
              <tr>
                <td>${idx + 1}</td>
                <td>${DOM.escapeHTML(sub.name || 'Subject ' + (idx + 1))}</td>
                <td>${cred}</td>
                <td><span class="badge badge-purple">${DOM.escapeHTML(sub.grade || '—')}</span></td>
                <td>${pts.toFixed(1)}</td>
                <td>${subTotal}</td>
              </tr>
            `;
          }).join('');
        }
      } else {
        // CGPA Details
        if (this.detailTitleEl) this.detailTitleEl.textContent = `${rec.title || 'Cumulative CGPA'} Breakdown`;
        const semCount = rec.semesterCount || (Array.isArray(rec.semesters) ? rec.semesters.length : 0);
        if (this.detailStatsEl) {
          this.detailStatsEl.innerHTML = `
            <div class="modal-stat-card">
              <span class="modal-stat-label">CGPA</span>
              <span class="modal-stat-val">${Calculations.formatPrecision(rec.cgpa, precision)}</span>
            </div>
            <div class="modal-stat-card">
              <span class="modal-stat-label">Semesters</span>
              <span class="modal-stat-val">${semCount}</span>
            </div>
            <div class="modal-stat-card">
              <span class="modal-stat-label">Total Credits</span>
              <span class="modal-stat-val">${rec.totalCredits}</span>
            </div>
          `;
        }

        if (this.detailTheadEl) {
          this.detailTheadEl.innerHTML = `
            <tr>
              <th>#</th>
              <th>Semester</th>
              <th>SGPA</th>
              <th>Credits</th>
              <th>Weighted Points</th>
            </tr>
          `;
        }

        if (this.detailTbodyEl) {
          const sems = Array.isArray(rec.semesters) ? rec.semesters : [];
          this.detailTbodyEl.innerHTML = sems.map((sem, idx) => {
            const sgpa = Number(sem.sgpa) || 0;
            const cred = Number(sem.credits) || 0;
            const weighted = (sgpa * cred).toFixed(2);
            return `
              <tr>
                <td>${idx + 1}</td>
                <td>${DOM.escapeHTML(sem.semester || 'Semester ' + (idx + 1))}</td>
                <td>${Calculations.formatPrecision(sgpa, precision)}</td>
                <td>${cred}</td>
                <td>${weighted}</td>
              </tr>
            `;
          }).join('');
        }
      }

      if (this.modalDetailEl) {
        this.modalDetailEl.classList.add('is-open');
      }
    },

    closeDetailModal() {
      if (this.modalDetailEl) {
        this.modalDetailEl.classList.remove('is-open');
      }
      this.activeRecord = null;
    },

    // =========================================================================
    // Edit Record Modal & Historical Grade-Point Preservation
    // =========================================================================
    openEditModal(type, id) {
      const { Storage, DOM } = global.GradeMate;
      const list = type === 'sgpa' ? Storage.getSGPAHistory() : Storage.getCGPAHistory();
      const rec = list.find((item) => item.id === id);
      if (!rec) return;

      this.activeRecord = JSON.parse(JSON.stringify(rec)); // Deep copy
      this.activeRecordType = type;

      const dateStr = this.formatRecordDate(rec);
      if (this.editDateEl) {
        this.editDateEl.textContent = `Original calculated timestamp preserved (${dateStr})`;
      }

      if (this.editValidationBoxEl) DOM.toggle(this.editValidationBoxEl, false);

      if (type === 'sgpa') {
        if (this.editTitleEl) this.editTitleEl.textContent = 'Edit SGPA Semester Record';
        if (this.editRecordTitleLabelEl) this.editRecordTitleLabelEl.textContent = 'Semester Name';
        if (this.editItemsHeadingEl) this.editItemsHeadingEl.textContent = 'Subject Breakdown';
        if (this.editRecordTitleInputEl) this.editRecordTitleInputEl.value = rec.semester || '';

        this.renderEditItems(rec.subjects || [], 'sgpa');
      } else {
        if (this.editTitleEl) this.editTitleEl.textContent = 'Edit Cumulative CGPA Record';
        if (this.editRecordTitleLabelEl) this.editRecordTitleLabelEl.textContent = 'Calculation Title';
        if (this.editItemsHeadingEl) this.editItemsHeadingEl.textContent = 'Included Semesters';
        if (this.editRecordTitleInputEl) this.editRecordTitleInputEl.value = rec.title || '';

        this.renderEditItems(rec.semesters || [], 'cgpa');
      }

      this.recalculateEditSummary();

      if (this.modalEditEl) {
        this.modalEditEl.classList.add('is-open');
      }
    },

    /**
     * Render editable rows in edit modal
     * @param {Array} items
     * @param {'sgpa'|'cgpa'} type
     */
    renderEditItems(items, type) {
      const { DOM } = global.GradeMate;
      if (!this.editItemsContainerEl) return;
      this.editItemsContainerEl.innerHTML = '';

      items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'edit-row';

        if (type === 'sgpa') {
          // Preserves saved numeric points; explicit grade-point input ensures no silent mapping
          row.innerHTML = `
            <input type="text" class="form-input form-input-sub-name" placeholder="Subject Name" aria-label="Subject name" value="${DOM.escapeHTML(item.name || '')}">
            <input type="number" class="form-input form-input-sub-credits" placeholder="Credits" aria-label="Subject credits" step="0.5" min="0.5" value="${item.credits || ''}">
            <input type="text" class="form-input form-input-sub-grade" placeholder="Grade" aria-label="Grade letter" maxlength="5" value="${DOM.escapeHTML(item.grade || '')}">
            <input type="number" class="form-input form-input-sub-points" placeholder="Points" aria-label="Grade points" step="0.01" min="0" value="${item.points !== undefined ? item.points : ''}">
            <button type="button" class="btn btn-outline btn-sm btn-remove-edit-item" aria-label="Remove item">&times;</button>
          `;
        } else {
          row.innerHTML = `
            <input type="text" class="form-input form-input-sem-name" placeholder="Semester Name" aria-label="Semester name" value="${DOM.escapeHTML(item.semester || '')}">
            <input type="number" class="form-input form-input-sem-sgpa" placeholder="SGPA" aria-label="Semester SGPA" step="0.01" min="0" value="${item.sgpa !== undefined ? item.sgpa : ''}">
            <input type="number" class="form-input form-input-sem-credits" placeholder="Credits" aria-label="Semester credits" step="0.5" min="0.5" value="${item.credits || ''}">
            <div style="font-size: 11px; color: var(--text-muted); text-align: center;">Points: <span class="sem-pts-preview">0</span></div>
            <button type="button" class="btn btn-outline btn-sm btn-remove-edit-item" aria-label="Remove item">&times;</button>
          `;
        }

        // Live update summary on change
        const inputs = row.querySelectorAll('input');
        inputs.forEach((input) => {
          DOM.on(input, 'input', () => this.recalculateEditSummary());
        });

        // Remove item
        const removeBtn = row.querySelector('.btn-remove-edit-item');
        DOM.on(removeBtn, 'click', () => {
          if (this.editItemsContainerEl.children.length > 1) {
            row.remove();
            this.recalculateEditSummary();
          }
        });

        this.editItemsContainerEl.appendChild(row);
      });
    },

    addEditItemRow() {
      if (!this.editItemsContainerEl) return;
      const type = this.activeRecordType;
      const dummy = type === 'sgpa'
        ? [{ name: '', credits: 3.0, grade: 'A', points: 8.0 }]
        : [{ semester: `Semester ${this.editItemsContainerEl.children.length + 1}`, sgpa: 8.0, credits: 20.0 }];

      const prevLength = this.editItemsContainerEl.children.length;
      this.renderEditItems([...this.gatherEditItems(), ...dummy], type);
    },

    gatherEditItems() {
      const type = this.activeRecordType;
      const rows = Array.from(this.editItemsContainerEl ? this.editItemsContainerEl.children : []);
      if (type === 'sgpa') {
        return rows.map((row) => ({
          name: row.querySelector('.form-input-sub-name').value.trim(),
          credits: parseFloat(row.querySelector('.form-input-sub-credits').value) || 0,
          grade: row.querySelector('.form-input-sub-grade').value.trim(),
          points: parseFloat(row.querySelector('.form-input-sub-points').value) || 0
        }));
      } else {
        return rows.map((row) => ({
          semester: row.querySelector('.form-input-sem-name').value.trim(),
          sgpa: parseFloat(row.querySelector('.form-input-sem-sgpa').value) || 0,
          credits: parseFloat(row.querySelector('.form-input-sem-credits').value) || 0
        }));
      }
    },

    recalculateEditSummary() {
      const { Calculations, Storage } = global.GradeMate;
      const precision = Storage.getPreferences().decimalPrecision || 2;
      const items = this.gatherEditItems();
      const type = this.activeRecordType;

      let totalCredits = 0;
      let totalPoints = 0;

      if (type === 'sgpa') {
        items.forEach((item) => {
          if (item.credits > 0) {
            totalCredits += item.credits;
            totalPoints += item.credits * item.points;
          }
        });
        const sgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
        if (this.editSummaryStatsEl) {
          this.editSummaryStatsEl.innerHTML = `
            <span>Recalculated SGPA: <strong>${Calculations.formatPrecision(sgpa, precision)}</strong></span>
            <span>Total Credits: <strong>${totalCredits}</strong></span>
            <span>Total Points: <strong>${Calculations.formatPrecision(totalPoints, 2)}</strong></span>
          `;
        }
      } else {
        items.forEach((item) => {
          if (item.credits > 0) {
            totalCredits += item.credits;
            totalPoints += item.credits * item.sgpa;
          }
        });
        const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
        if (this.editSummaryStatsEl) {
          this.editSummaryStatsEl.innerHTML = `
            <span>Recalculated CGPA: <strong>${Calculations.formatPrecision(cgpa, precision)}</strong></span>
            <span>Total Credits: <strong>${totalCredits}</strong></span>
            <span>Semesters: <strong>${items.length}</strong></span>
          `;
        }
      }
    },

    saveEditRecord() {
      const { Storage, State, DOM } = global.GradeMate;
      const type = this.activeRecordType;
      const recordId = this.activeRecord ? this.activeRecord.id : null;
      if (!recordId) return;

      const title = (this.editRecordTitleInputEl.value || '').trim();
      const items = this.gatherEditItems();
      const errors = [];

      if (!title) {
        errors.push(type === 'sgpa' ? 'Semester name cannot be empty.' : 'Calculation title cannot be empty.');
      }
      if (items.length === 0) {
        errors.push('At least one item row is required.');
      }

      let totalCredits = 0;
      let totalPoints = 0;

      if (type === 'sgpa') {
        items.forEach((sub, idx) => {
          if (!sub.name) errors.push(`Subject #${idx + 1}: Name is required.`);
          if (sub.credits <= 0) errors.push(`Subject #${idx + 1}: Credits must be greater than zero.`);
          if (!sub.grade) errors.push(`Subject #${idx + 1}: Grade letter is required.`);
          if (sub.points < 0 || isNaN(sub.points)) errors.push(`Subject #${idx + 1}: Valid non-negative grade points required.`);
          totalCredits += sub.credits;
          totalPoints += sub.credits * sub.points;
        });
      } else {
        items.forEach((sem, idx) => {
          if (!sem.semester) errors.push(`Semester #${idx + 1}: Name is required.`);
          if (sem.credits <= 0) errors.push(`Semester #${idx + 1}: Credits must be greater than zero.`);
          if (sem.sgpa < 0 || isNaN(sem.sgpa)) errors.push(`Semester #${idx + 1}: Valid non-negative SGPA required.`);
          totalCredits += sem.credits;
          totalPoints += sem.credits * sem.sgpa;
        });
      }

      if (totalCredits <= 0) {
        errors.push('Total completed credits must be greater than zero.');
      }

      if (errors.length > 0) {
        if (this.editValidationListEl) {
          this.editValidationListEl.innerHTML = errors.map((e) => `<li>${DOM.escapeHTML(e)}</li>`).join('');
        }
        DOM.toggle(this.editValidationBoxEl, true);
        return;
      }

      DOM.toggle(this.editValidationBoxEl, false);

      if (type === 'sgpa') {
        const sgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
        Storage.updateSGPARecord(recordId, {
          semester: title,
          subjects: items,
          totalCredits,
          totalPoints,
          sgpa
        });
      } else {
        const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
        Storage.updateCGPARecord(recordId, {
          title,
          semesters: items,
          totalCredits,
          totalPoints,
          semesterCount: items.length,
          cgpa
        });
      }

      // Synchronize Dashboard and other views
      State.emit('history:updated');

      this.closeEditModal();
      this.render();
    },

    closeEditModal() {
      if (this.modalEditEl) {
        this.modalEditEl.classList.remove('is-open');
      }
      this.activeRecord = null;
    },

    // =========================================================================
    // Delete Record Modal
    // =========================================================================
    openDeleteModal(type, id) {
      const { Storage, Calculations, DOM } = global.GradeMate;
      const list = type === 'sgpa' ? Storage.getSGPAHistory() : Storage.getCGPAHistory();
      const rec = list.find((item) => item.id === id);
      if (!rec) return;

      this.activeRecord = rec;
      this.activeRecordType = type;

      const title = type === 'sgpa' ? rec.semester : rec.title;
      const score = type === 'sgpa' ? `${Calculations.formatPrecision(rec.sgpa, 2)} SGPA` : `${Calculations.formatPrecision(rec.cgpa, 2)} CGPA`;
      const dateStr = this.formatRecordDate(rec);

      if (this.deletePreviewEl) {
        this.deletePreviewEl.innerHTML = `
          <div><strong>${DOM.escapeHTML(title || 'Record')}</strong></div>
          <div>Result: ${score} &bull; Total Credits: ${rec.totalCredits}</div>
          <div style="font-size: 11px; margin-top: 4px;">Date: ${dateStr}</div>
        `;
      }

      if (this.modalDeleteEl) {
        this.modalDeleteEl.classList.add('is-open');
      }
    },

    confirmDeleteRecord() {
      const { Storage, State } = global.GradeMate;
      if (!this.activeRecord) return;

      const { id } = this.activeRecord;
      const type = this.activeRecordType;

      if (type === 'sgpa') {
        Storage.deleteSGPARecord(id);
      } else {
        Storage.deleteCGPARecord(id);
      }

      // Emit event to update Dashboard immediately
      State.emit('history:updated');

      this.closeDeleteModal();
      this.render();
    },

    closeDeleteModal() {
      if (this.modalDeleteEl) {
        this.modalDeleteEl.classList.remove('is-open');
      }
      this.activeRecord = null;
    },

    /**
     * Complete reset of History View filters, inputs, rendered lists, and modals
     */
    resetState() {
      this.activeTab = 'sgpa';
      this.searchQuery = '';
      this.sortCriteria = 'date-desc';

      if (this.searchInputEl) this.searchInputEl.value = '';
      if (this.sortSelectEl) this.sortSelectEl.value = 'date-desc';
      if (this.listSgpaEl) this.listSgpaEl.innerHTML = '';
      if (this.listCgpaEl) this.listCgpaEl.innerHTML = '';

      if (this.modalDetailEl) this.modalDetailEl.classList.remove('is-open');
      if (this.modalEditEl) this.modalEditEl.classList.remove('is-open');
      if (this.modalDeleteEl) this.modalDeleteEl.classList.remove('is-open');

      this.activeRecord = null;
      this.switchTab('sgpa');
    }
  };

  global.GradeMate = global.GradeMate || {};
  global.GradeMate.Views = global.GradeMate.Views || {};
  global.GradeMate.Views.History = HistoryView;
})(window);
