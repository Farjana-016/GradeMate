"""
GradeMate — Phase 6 Automated End-to-End Test Suite & Verification Script
Covers Calculation History (dual tabs, search, sort, details modal, editing, deletion),
Settings (Profile, Academic Preferences, Data Management, About),
Backup atomic rollback safety, Complete nuclear reset, and Responsive layouts.
"""
import http.server
import socketserver
import threading
import time
import os
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

PORT = 5595
WORKSPACE_DIR = r"C:\Users\Hp\OneDrive\Documents\GradeMate"
SCREENSHOT_DIR = os.path.join(WORKSPACE_DIR, "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WORKSPACE_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

def safe_click(driver, elem):
    driver.execute_script("arguments[0].scrollIntoView({block: 'center', inline: 'nearest'});", elem)
    time.sleep(0.15)
    driver.execute_script("arguments[0].click();", elem)
    time.sleep(0.2)

def run_tests():
    httpd = socketserver.TCPServer(("", PORT), QuietHandler)
    server_thread = threading.Thread(target=httpd.serve_forever)
    server_thread.daemon = True
    server_thread.start()
    print(f"[OK] Test server running on port {PORT}")

    test_results = []
    def log(name, passed, detail=""):
        status = "PASS" if passed else "FAIL"
        test_results.append((name, status, detail))
        print(f"[{status}] {name} {detail}")

    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1440,900")
    chrome_options.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    driver = webdriver.Chrome(options=chrome_options)
    url = f"http://localhost:{PORT}/index.html"

    try:
        def seed_data():
            driver.get(url)
            driver.execute_script("""
                localStorage.clear();
                localStorage.setItem('grademate_profile', JSON.stringify({
                    name: 'Alex Rivera',
                    onboarded: true
                }));
                localStorage.setItem('grademate_preferences', JSON.stringify({
                    decimalPrecision: 2,
                    gradingSystemId: 'scale_10_standard',
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
                }));
                localStorage.setItem('grademate_sgpa_history', JSON.stringify([
                    {
                        id: 'sgpa_sem1',
                        semester: 'Semester 1',
                        sgpa: 8.50,
                        totalCredits: 20.0,
                        totalPoints: 170.0,
                        subjects: [
                            { name: 'Mathematics I', credits: 4.0, grade: 'A+', points: 9.0 },
                            { name: 'Physics', credits: 4.0, grade: 'A', points: 8.0 },
                            { name: 'Computer Programming', credits: 4.0, grade: 'O', points: 10.0 },
                            { name: 'Engineering Graphics', credits: 4.0, grade: 'B+', points: 7.0 },
                            { name: 'Basic Electrical', credits: 4.0, grade: 'A', points: 8.0 }
                        ],
                        calculatedAt: '2026-10-01T10:00:00.000Z',
                        updatedAt: '2026-10-01T10:00:00.000Z'
                    },
                    {
                        id: 'sgpa_sem2',
                        semester: 'Semester 2',
                        sgpa: 9.00,
                        totalCredits: 22.0,
                        totalPoints: 198.0,
                        subjects: [
                            { name: 'Data Structures', credits: 4.0, grade: 'O', points: 10.0 },
                            { name: 'Mathematics II', credits: 4.0, grade: 'A+', points: 9.0 },
                            { name: 'Digital Logic', credits: 4.0, grade: 'A+', points: 9.0 },
                            { name: 'Chemistry', credits: 4.0, grade: 'A', points: 8.0 },
                            { name: 'Programming Lab', credits: 6.0, grade: 'A+', points: 9.0 }
                        ],
                        calculatedAt: '2026-10-15T10:00:00.000Z',
                        updatedAt: '2026-10-15T10:00:00.000Z'
                    },
                    {
                        id: 'sgpa_sem3_nodate',
                        semester: 'Semester 3 (Legacy)',
                        sgpa: 7.80,
                        totalCredits: 20.0,
                        totalPoints: 156.0,
                        subjects: [
                            { name: 'Algorithms', credits: 5.0, grade: 'A', points: 8.0 },
                            { name: 'Database Systems', credits: 5.0, grade: 'B+', points: 7.0 }
                        ]
                    }
                ]));
                localStorage.setItem('grademate_cgpa_history', JSON.stringify([
                    {
                        id: 'cgpa_freshman_year',
                        title: 'Freshman Year Cumulative',
                        cgpa: 8.76,
                        totalCredits: 42.0,
                        totalPoints: 368.0,
                        semesterCount: 2,
                        semesters: [
                            { semester: 'Semester 1', sgpa: 8.50, credits: 20.0 },
                            { semester: 'Semester 2', sgpa: 9.00, credits: 22.0 }
                        ],
                        calculatedAt: '2026-10-20T10:00:00.000Z',
                        updatedAt: '2026-10-20T10:00:00.000Z'
                    }
                ]));
            """)
            driver.refresh()
            time.sleep(0.3)

        print("\n--- 1. NAVIGATION & INITIAL HISTORY VIEW ---")
        seed_data()
        driver.execute_script("window.GradeMate.App.navigateTo('history');")
        time.sleep(0.3)
        history_active = driver.execute_script("return document.getElementById('view-history').classList.contains('active');")
        log("Navigate to Calculation History view", history_active)

        sgpa_cards_count = driver.execute_script("return document.querySelectorAll('#history-sgpa-list .history-card').length;")
        log("Initial SGPA History cards rendered (3 records)", sgpa_cards_count == 3, f"(Rendered: {sgpa_cards_count})")

        # Missing timestamp handling
        no_date_meta = driver.execute_script("""
            const card = document.querySelector('[data-record-id="sgpa_sem3_nodate"]');
            return card ? card.innerText.includes('Date unavailable') : false;
        """)
        log("Missing historical timestamp displays 'Date unavailable'", no_date_meta)

        ss1 = os.path.join(SCREENSHOT_DIR, "phase6_01_history_sgpa.png")
        driver.save_screenshot(ss1)
        print(f"Saved {ss1}")

        print("\n--- 2. HISTORY DUAL TABS, SEARCH & SORTING ---")
        # Tab switch to CGPA
        cgpa_tab_btn = driver.find_element(By.ID, "tab-btn-cgpa")
        safe_click(driver, cgpa_tab_btn)
        time.sleep(0.2)
        cgpa_panel_active = driver.execute_script("""
            return !document.getElementById('panel-history-cgpa').classList.contains('is-hidden') &&
                   document.getElementById('panel-history-sgpa').classList.contains('is-hidden');
        """)
        cgpa_cards_count = driver.execute_script("return document.querySelectorAll('#history-cgpa-list .history-card').length;")
        log("Switch to CGPA History tab", cgpa_panel_active and cgpa_cards_count == 1, f"(CGPA cards: {cgpa_cards_count})")

        ss4 = os.path.join(SCREENSHOT_DIR, "phase6_04_history_cgpa.png")
        driver.save_screenshot(ss4)
        print(f"Saved {ss4}")

        # Switch back to SGPA tab
        safe_click(driver, driver.find_element(By.ID, "tab-btn-sgpa"))
        time.sleep(0.2)

        # Search test
        search_input = driver.find_element(By.ID, "history-search-input")
        search_input.clear()
        search_input.send_keys("Semester 1")
        time.sleep(0.2)
        search_count = driver.execute_script("return document.querySelectorAll('#history-sgpa-list .history-card').length;")
        log("Search filter displays matching semester cards only", search_count == 1, f"(Matches: {search_count})")

        # Clear search
        search_input.clear()
        driver.execute_script("document.getElementById('history-search-input').dispatchEvent(new Event('input', {bubbles: true}));")
        time.sleep(0.2)

        # Sorting test: Score (Highest First)
        driver.execute_script("""
            const sel = document.getElementById('history-sort-select');
            sel.value = 'score-desc';
            sel.dispatchEvent(new Event('change', {bubbles: true}));
        """)
        time.sleep(0.2)
        first_card_score = driver.execute_script("""
            const firstBadge = document.querySelector('#history-sgpa-list .history-card .history-card-badge');
            return firstBadge ? firstBadge.textContent.trim() : '';
        """)
        log("Sort by Score (Highest First) places 9.00 SGPA first", "9.00" in first_card_score, f"(First: {first_card_score})")

        print("\n--- 3. VIEW DETAILS MODAL ---")
        detail_btn = driver.find_element(By.CSS_SELECTOR, '[data-record-id="sgpa_sem1"] .btn-view-detail')
        safe_click(driver, detail_btn)
        time.sleep(0.3)
        detail_modal_open = driver.execute_script("""
            const modal = document.getElementById('modal-history-detail');
            const rows = document.querySelectorAll('#detail-modal-tbody tr');
            return modal.classList.contains('is-open') && rows.length == 5;
        """)
        log("View Details modal opens with complete 5-subject itemized breakdown", detail_modal_open)

        ss2 = os.path.join(SCREENSHOT_DIR, "phase6_02_history_detail_modal.png")
        driver.save_screenshot(ss2)
        print(f"Saved {ss2}")

        safe_click(driver, driver.find_element(By.ID, "btn-close-detail-modal"))
        time.sleep(0.2)

        print("\n--- 4. HISTORICAL SGPA EDITING & GRADE-POINT PRESERVATION ---")
        edit_btn = driver.find_element(By.CSS_SELECTOR, '[data-record-id="sgpa_sem1"] .btn-edit-record')
        safe_click(driver, edit_btn)
        time.sleep(0.3)
        edit_modal_open = driver.execute_script("return document.getElementById('modal-history-edit').classList.contains('is-open');")
        log("Edit Record modal opens", edit_modal_open)

        # Verify saved numeric grade points are displayed in inputs
        preserved_points = driver.execute_script("""
            const inputs = Array.from(document.querySelectorAll('#edit-items-container .form-input-sub-points'));
            return inputs.map(i => parseFloat(i.value));
        """)
        log("Saved numeric grade points preserved in edit rows ([9.0, 8.0, 10.0, 7.0, 8.0])",
            preserved_points == [9.0, 8.0, 10.0, 7.0, 8.0], f"(Got: {preserved_points})")

        # Refinement 3: Verify dynamic edit inputs have accessible aria-labels
        aria_labels_valid = driver.execute_script("""
            const rows = document.querySelectorAll('#edit-items-container .edit-row');
            return Array.from(rows).every(row => {
                const nameIn = row.querySelector('.form-input-sub-name');
                const credIn = row.querySelector('.form-input-sub-credits');
                const gradeIn = row.querySelector('.form-input-sub-grade');
                const ptsIn = row.querySelector('.form-input-sub-points');
                return (
                    nameIn && nameIn.getAttribute('aria-label') === 'Subject name' &&
                    credIn && credIn.getAttribute('aria-label') === 'Subject credits' &&
                    gradeIn && gradeIn.getAttribute('aria-label') === 'Grade letter' &&
                    ptsIn && ptsIn.getAttribute('aria-label') === 'Grade points'
                );
            });
        """)
        log("Dynamic SGPA edit rows have accessible aria-label attributes", aria_labels_valid)

        # Modify: Change subject 1 name, add 1 credit (credits: 4 -> 5), keep points as 9.0
        # Subject 1 new points: 5 * 9.0 = 45.0. Total Credits: 21. Total Points: 179.0. SGPA = 179 / 21 = 8.5238 -> 8.52
        driver.execute_script("""
            const rows = document.querySelectorAll('#edit-items-container .edit-row');
            const firstRowName = rows[0].querySelector('.form-input-sub-name');
            const firstRowCred = rows[0].querySelector('.form-input-sub-credits');
            firstRowName.value = 'Advanced Mathematics I';
            firstRowCred.value = '5';
            firstRowCred.dispatchEvent(new Event('input', {bubbles: true}));
        """)
        time.sleep(0.2)

        ss3 = os.path.join(SCREENSHOT_DIR, "phase6_03_history_edit_modal.png")
        driver.save_screenshot(ss3)
        print(f"Saved {ss3}")

        # Save edit
        safe_click(driver, driver.find_element(By.ID, "btn-save-edit"))
        time.sleep(0.3)

        # Verify updated record in localStorage
        edit_verification = driver.execute_script("""
            const history = JSON.parse(localStorage.getItem('grademate_sgpa_history') || '[]');
            const rec = history.find(r => r.id === 'sgpa_sem1');
            return {
                found: !!rec,
                totalCredits: rec ? rec.totalCredits : 0,
                sgpa: rec ? rec.sgpa : 0,
                calculatedAtPreserved: rec ? rec.calculatedAt === '2026-10-01T10:00:00.000Z' : false,
                updatedAtChanged: rec ? rec.updatedAt !== '2026-10-01T10:00:00.000Z' : false,
                firstName: rec && rec.subjects[0] ? rec.subjects[0].name : '',
                firstPoints: rec && rec.subjects[0] ? rec.subjects[0].points : 0
            };
        """)
        log("Edited SGPA recalculated correctly (Credits: 21, SGPA: 8.43)",
            abs(edit_verification["sgpa"] - 8.4286) < 0.01 and edit_verification["totalCredits"] == 21,
            f"(SGPA: {edit_verification['sgpa']:.4f}, Credits: {edit_verification['totalCredits']})")
        log("Original ID and calculatedAt preserved with updatedAt refreshed",
            edit_verification["calculatedAtPreserved"] and edit_verification["updatedAtChanged"])
        log("Subject grade points preserved (9.0) under renamed subject ('Advanced Mathematics I')",
            edit_verification["firstPoints"] == 9.0 and edit_verification["firstName"] == 'Advanced Mathematics I')

        # Check Dashboard synchronization and recalculate alert
        driver.execute_script("window.GradeMate.App.navigateTo('dashboard');")
        time.sleep(0.3)
        dashboard_alert_visible = driver.execute_script("""
            const alert = document.getElementById('cgpa-recalculate-notice');
            return alert && !alert.classList.contains('is-hidden');
        """)
        log("Dashboard detects revised SGPA and displays recalculate notice", dashboard_alert_visible)

        print("\n--- 5. RECORD DELETION & DASHBOARD SYNC ---")
        driver.execute_script("window.GradeMate.App.navigateTo('history');")
        time.sleep(0.3)
        del_btn = driver.find_element(By.CSS_SELECTOR, '[data-record-id="sgpa_sem3_nodate"] .btn-delete-record')
        safe_click(driver, del_btn)
        time.sleep(0.2)
        delete_modal_open = driver.execute_script("return document.getElementById('modal-history-delete').classList.contains('is-open');")
        log("Delete confirmation modal displayed", delete_modal_open)

        # Confirm delete
        safe_click(driver, driver.find_element(By.ID, "btn-confirm-delete"))
        time.sleep(0.3)
        remaining_count = driver.execute_script("""
            const history = JSON.parse(localStorage.getItem('grademate_sgpa_history') || '[]');
            return history.length;
        """)
        log("Record deleted cleanly from storage (2 remaining)", remaining_count == 2, f"(Remaining: {remaining_count})")

        print("\n--- 6. SETTINGS SECTION 1: PROFILE SETTINGS ---")
        driver.execute_script("window.GradeMate.App.navigateTo('settings');")
        time.sleep(0.3)
        settings_active = driver.execute_script("return document.getElementById('view-settings').classList.contains('active');")
        log("Navigate to Settings view", settings_active)

        # Edit profile name
        user_name_input = driver.find_element(By.ID, "settings-user-name")
        user_name_input.clear()
        user_name_input.send_keys("Dr. Alexandra Rivera")
        safe_click(driver, driver.find_element(By.ID, "btn-save-profile"))
        time.sleep(0.2)

        # Verify Dashboard greeting updated immediately
        driver.execute_script("window.GradeMate.App.navigateTo('dashboard');")
        time.sleep(0.2)
        dashboard_greeting = driver.find_element(By.ID, "dashboard-greeting-text").text
        log("Profile name update reflects immediately in Dashboard greeting", "Dr. Alexandra Rivera" in dashboard_greeting, f"('{dashboard_greeting}')")

        print("\n--- 7. SETTINGS SECTION 2: ACADEMIC PREFERENCES ---")
        driver.execute_script("window.GradeMate.App.navigateTo('settings');")
        time.sleep(0.2)

        # Switch to 4.0 US Scale
        driver.execute_script("""
            const sel = document.getElementById('settings-scale-select');
            sel.value = 'scale_4_us';
            sel.dispatchEvent(new Event('change', {bubbles: true}));
        """)
        time.sleep(0.2)
        max_scale_val = driver.find_element(By.ID, "settings-max-scale").get_attribute("value")
        log("Switching to 4.0 US preset updates max scale to 4.0", max_scale_val in ["4.0", "4"], f"(Max: {max_scale_val})")

        # Switch to Custom Scale and add custom grade 'Ex' (10.0 points)
        driver.execute_script("""
            const sel = document.getElementById('settings-scale-select');
            sel.value = 'scale_custom';
            sel.dispatchEvent(new Event('change', {bubbles: true}));
        """)
        time.sleep(0.2)
        safe_click(driver, driver.find_element(By.ID, "btn-add-grade-row"))
        time.sleep(0.1)
        driver.execute_script("""
            const rows = document.querySelectorAll('#settings-grade-tbody tr');
            const lastRow = rows[rows.length - 1];
            lastRow.querySelector('.grade-letter-input').value = 'Ex';
            lastRow.querySelector('.grade-points-input').value = '10.0';
        """)
        safe_click(driver, driver.find_element(By.ID, "btn-save-preferences"))
        time.sleep(0.3)

        # Switch to 10-Point preset, then switch back to Custom -> confirm 'Ex' is preserved
        driver.execute_script("""
            const sel = document.getElementById('settings-scale-select');
            sel.value = 'scale_10_standard';
            sel.dispatchEvent(new Event('change', {bubbles: true}));
            sel.value = 'scale_custom';
            sel.dispatchEvent(new Event('change', {bubbles: true}));
        """)
        time.sleep(0.2)
        custom_preserved = driver.execute_script("""
            const rows = Array.from(document.querySelectorAll('#settings-grade-tbody tr'));
            return rows.some(r => r.querySelector('.grade-letter-input').value === 'Ex');
        """)
        log("Custom grade scale mappings preserved when switching between presets", custom_preserved)

        # Refinement 2: Verify custom mapping preservation on first dropdown interaction immediately after opening Settings
        first_interaction_preserved = driver.execute_script("""
            // Seed a custom scale configuration
            const customPrefs = {
                gradingSystemId: 'scale_custom',
                customGrades: [
                    { grade: 'A+', points: 4.0 },
                    { grade: 'B', points: 3.0 },
                    { grade: 'F', points: 0.0 }
                ]
            };
            window.GradeMate.Storage.savePreferences(customPrefs);
            // Navigate to settings (calls loadPreferences())
            window.GradeMate.App.navigateTo('settings');

            // Immediately on first interaction, switch to 10-point standard without prior clicks
            const selectEl = document.getElementById('settings-scale-select');
            selectEl.value = 'scale_10_standard';
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));

            // Check that savedCustomGrades was cached
            const prefsAfterSwitch = window.GradeMate.Storage.getPreferences();
            const cachedCustom = prefsAfterSwitch.savedCustomGrades || [];
            const cachedCorrectly = cachedCustom.length === 3 && cachedCustom[0].grade === 'A+' && cachedCustom[0].points === 4.0;

            // Switch back to custom scale immediately
            selectEl.value = 'scale_custom';
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));

            // Check rendered rows in table
            const renderedGrades = Array.from(document.querySelectorAll('#settings-grade-tbody tr')).map(tr => ({
                grade: tr.querySelector('.grade-letter-input').value,
                points: parseFloat(tr.querySelector('.grade-points-input').value)
            }));
            const restoredCorrectly = renderedGrades.length === 3 && renderedGrades[0].grade === 'A+' && renderedGrades[0].points === 4.0;

            return cachedCorrectly && restoredCorrectly;
        """)
        log("Initial dropdown interaction preserves and restores custom scale without prior interaction", first_interaction_preserved)

        ss5 = os.path.join(SCREENSHOT_DIR, "phase6_05_settings_profile_academic.png")
        driver.save_screenshot(ss5)
        print(f"Saved {ss5}")

        print("\n--- 8. SETTINGS SECTION 3: DATA MANAGEMENT & BACKUP SAFETY ---")
        # Test Storage.exportBackup()
        export_data = driver.execute_script("return window.GradeMate.Storage.exportBackup();")
        log("Backup export generates valid GradeMate schema",
            export_data.get("app") == "GradeMate" and export_data.get("version") == "1.0.0" and "sgpaHistory" in export_data,
            f"(App: {export_data.get('app')}, Ver: {export_data.get('version')})")

        # Pre-flight schema validation rejects invalid backups with zero data modification
        invalid_check = driver.execute_script("""
            const prevProfile = localStorage.getItem('grademate_profile');
            const res = window.GradeMate.Storage.importBackup(JSON.stringify({ app: 'FakeApp' }));
            const postProfile = localStorage.getItem('grademate_profile');
            return {
                resSuccess: res.success,
                dataUntouched: prevProfile === postProfile
            };
        """)
        log("Invalid backup rejected by pre-flight validation with data untouched",
            not invalid_check["resSuccess"] and invalid_check["dataUntouched"])

        # Refinement 1: Verify malformed backup array entries are rejected with zero LocalStorage writes
        malformed_entries_check = driver.execute_script("""
            const origProfile = localStorage.getItem('grademate_profile');
            const origPrefs = localStorage.getItem('grademate_preferences');
            const origSgpa = localStorage.getItem('grademate_sgpa_history');
            const origCgpa = localStorage.getItem('grademate_cgpa_history');

            const validBackup = window.GradeMate.Storage.exportBackup();

            // Case 1: Null element in sgpaHistory
            const backupNullSgpa = JSON.parse(JSON.stringify(validBackup));
            backupNullSgpa.sgpaHistory.push(null);
            const resNullSgpa = window.GradeMate.Storage.importBackup(backupNullSgpa);

            // Case 2: Primitive string element in sgpaHistory
            const backupPrimSgpa = JSON.parse(JSON.stringify(validBackup));
            backupPrimSgpa.sgpaHistory.push("bad record");
            const resPrimSgpa = window.GradeMate.Storage.importBackup(backupPrimSgpa);

            // Case 3: Missing ID in cgpaHistory
            const backupMissingId = JSON.parse(JSON.stringify(validBackup));
            backupMissingId.cgpaHistory.push({ cgpa: 8.5, totalCredits: 20 });
            const resMissingId = window.GradeMate.Storage.importBackup(backupMissingId);

            // Case 4: Negative credits in sgpaHistory
            const backupNegCred = JSON.parse(JSON.stringify(validBackup));
            backupNegCred.sgpaHistory.push({ id: 'bad_cred', totalCredits: -5, sgpa: 8.0 });
            const resNegCred = window.GradeMate.Storage.importBackup(backupNegCred);

            // Case 5: Non-finite SGPA
            const backupNonFinite = JSON.parse(JSON.stringify(validBackup));
            backupNonFinite.sgpaHistory.push({ id: 'bad_sgpa', totalCredits: 20, sgpa: 'not-a-number' });
            const resNonFinite = window.GradeMate.Storage.importBackup(backupNonFinite);

            const allRejected = !resNullSgpa.success && !resPrimSgpa.success && !resMissingId.success && !resNegCred.success && !resNonFinite.success;
            const dataUntouched = (
                localStorage.getItem('grademate_profile') === origProfile &&
                localStorage.getItem('grademate_preferences') === origPrefs &&
                localStorage.getItem('grademate_sgpa_history') === origSgpa &&
                localStorage.getItem('grademate_cgpa_history') === origCgpa
            );

            return {
                allRejected,
                dataUntouched,
                errSample: resNullSgpa.error
            };
        """)
        log("Malformed backup array entries rejected by pre-flight validation with data untouched",
            malformed_entries_check["allRejected"] and malformed_entries_check["dataUntouched"],
            f"(Sample error: '{malformed_entries_check['errSample']}')")

        # Test Staged Write & Rollback Safety: simulate write failure on sgpa history
        rollback_check = driver.execute_script("""
            // Snapshot original
            const origProfile = localStorage.getItem('grademate_profile');
            const origSgpa = localStorage.getItem('grademate_sgpa_history');

            // Intentionally mock setItem to throw ONCE when writing 'grademate_sgpa_history', but allow rollback writes
            let writeAttempts = 0;
            const realSetItem = localStorage.setItem.bind(localStorage);
            localStorage.setItem = function(key, val) {
                if (key === 'grademate_sgpa_history' && writeAttempts === 0) {
                    writeAttempts++;
                    throw new Error('Simulated disk/quota write error');
                }
                realSetItem(key, val);
            };

            const testBackup = window.GradeMate.Storage.exportBackup();
            testBackup.profile.name = 'Tainted Name';
            const importRes = window.GradeMate.Storage.importBackup(testBackup);

            // Restore real setItem
            localStorage.setItem = realSetItem;

            const finalProfile = localStorage.getItem('grademate_profile');
            const finalSgpa = localStorage.getItem('grademate_sgpa_history');

            return {
                success: importRes.success,
                rolledBack: importRes.rolledBack,
                profileRestored: finalProfile === origProfile,
                sgpaRestored: finalSgpa === origSgpa
            };
        """)
        log("Staged write failure triggers independent rollback preserving all original keys",
            not rollback_check["success"] and rollback_check["rolledBack"] and rollback_check["profileRestored"] and rollback_check["sgpaRestored"])

        # Test Partial Rollback Reporting when a key fails rollback
        partial_rollback_check = driver.execute_script("""
            const realSetItem = localStorage.setItem.bind(localStorage);
            // Mock setItem to always throw on 'grademate_sgpa_history'
            localStorage.setItem = function(key, val) {
                if (key === 'grademate_sgpa_history') {
                    throw new Error('Permanent storage error');
                }
                realSetItem(key, val);
            };

            const testBackup = window.GradeMate.Storage.exportBackup();
            const importRes = window.GradeMate.Storage.importBackup(testBackup);
            localStorage.setItem = realSetItem;

            return {
                success: importRes.success,
                rolledBack: importRes.rolledBack,
                hasFailures: Array.isArray(importRes.rollbackFailures) && importRes.rollbackFailures.length > 0,
                reportedKey: importRes.rollbackFailures ? importRes.rollbackFailures[0].key : null
            };
        """)
        log("Partial rollback failure reports individual key failure correctly",
            not partial_rollback_check["success"] and not partial_rollback_check["rolledBack"] and partial_rollback_check["hasFailures"] and partial_rollback_check["reportedKey"] == 'grademate_sgpa_history')

        ss6 = os.path.join(SCREENSHOT_DIR, "phase6_06_settings_data_about.png")
        driver.save_screenshot(ss6)
        print(f"Saved {ss6}")

        print("\n--- 9. COMPLETE NUCLEAR APPLICATION RESET ---")
        driver.execute_script("window.GradeMate.App.executeCompleteReset();")
        time.sleep(0.4)

        reset_verification = driver.execute_script("""
            return {
                profileNull: localStorage.getItem('grademate_profile') === null,
                prefsNull: localStorage.getItem('grademate_preferences') === null,
                sgpaNull: localStorage.getItem('grademate_sgpa_history') === null,
                cgpaNull: localStorage.getItem('grademate_cgpa_history') === null,
                onboardingVisible: !document.getElementById('onboarding-screen').classList.contains('is-hidden'),
                nameInputClean: document.getElementById('student-name-input').value === '',
                urlHashClean: window.location.hash === '',
                dashboardGreeting: document.getElementById('dashboard-greeting-text').innerText.trim()
            };
        """)
        log("Complete reset: All 4 LocalStorage keys wiped (null)",
            reset_verification["profileNull"] and reset_verification["prefsNull"] and reset_verification["sgpaNull"] and reset_verification["cgpaNull"])
        log("Complete reset: Onboarding screen revealed with clean name input and clean URL hash",
            reset_verification["onboardingVisible"] and reset_verification["nameInputClean"] and reset_verification["urlHashClean"])

        print("\n--- 10. RESPONSIVE LAYOUTS & MOBILE OVERFLOW ---")
        # Re-onboard student for responsive checks
        driver.execute_script("""
            localStorage.setItem('grademate_profile', JSON.stringify({ name: 'Alex Rivera', onboarded: true }));
            window.GradeMate.App.init();
            window.GradeMate.App.navigateTo('history');
        """)
        time.sleep(0.3)

        # 390px mobile check
        driver.set_window_size(390, 844)
        time.sleep(0.3)
        overflow_390 = driver.execute_script("""
            return document.documentElement.scrollWidth <= window.innerWidth;
        """)
        log("History view at 390px has zero horizontal overflow", overflow_390)
        ss7 = os.path.join(SCREENSHOT_DIR, "phase6_07_history_mobile_390.png")
        driver.save_screenshot(ss7)
        print(f"Saved {ss7}")

        # 360px mobile check on Settings view
        driver.execute_script("window.GradeMate.App.navigateTo('settings');")
        driver.set_window_size(360, 780)
        time.sleep(0.3)
        overflow_360 = driver.execute_script("""
            return document.documentElement.scrollWidth <= window.innerWidth;
        """)
        log("Settings view at 360px has zero horizontal overflow", overflow_360)
        ss8 = os.path.join(SCREENSHOT_DIR, "phase6_08_settings_mobile_360.png")
        driver.save_screenshot(ss8)
        print(f"Saved {ss8}")

    finally:
        driver.quit()
        httpd.shutdown()

    print("\n============================================================")
    print("PHASE 6 TEST SUITE SUMMARY")
    print("============================================================")
    total_passed = sum(1 for _, st, _ in test_results if st == "PASS")
    total_tests = len(test_results)
    for name, st, detail in test_results:
        print(f"[{st}] {name} {detail}")
    print(f"\nTOTAL: {total_passed}/{total_tests} Passed.")
    return total_passed == total_tests

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
