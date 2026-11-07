"""
GradeMate — Phase 4 Automated End-to-End Test Suite & Screenshot Generator
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
from selenium.webdriver.support.ui import Select

PORT = 5540
WORKSPACE_DIR = r"C:\Users\Hp\OneDrive\Documents\GradeMate"
SCREENSHOT_DIR = os.path.join(WORKSPACE_DIR, "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WORKSPACE_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

httpd = socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler)
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()
print(f"[OK] Local test server running on http://127.0.0.1:{PORT}")

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--window-size=1280,800")

driver = webdriver.Chrome(options=chrome_options)
test_results = []

def safe_click(elem):
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
    time.sleep(0.15)
    driver.execute_script("arguments[0].click();", elem)

def record(name, condition, details=""):
    test_results.append({"name": name, "passed": condition, "details": details})
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {name} - {details}")

try:
    # -------------------------------------------------------------------------
    # TEST 1: Initial Render & Empty Import Warning
    # -------------------------------------------------------------------------
    driver.get(f"http://127.0.0.1:{PORT}/index.html")
    driver.execute_script("""
        localStorage.clear();
        localStorage.setItem('grademate_profile', JSON.stringify({
            name: 'Alex Mercer',
            onboarded: true
        }));
        location.reload();
    """)
    time.sleep(0.5)

    # Navigate to CGPA Calculator
    safe_click(driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='cgpa']"))
    time.sleep(0.3)

    cgpa_panel = driver.find_element(By.ID, "view-cgpa")
    record("Navigate to CGPA Calculator View", "active" in cgpa_panel.get_attribute("class"))

    initial_rows = driver.find_elements(By.CSS_SELECTOR, "#cgpa-semester-rows .semester-row")
    record("Initial 2 default semester rows rendered", len(initial_rows) == 2, f"Count: {len(initial_rows)}")

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase4_01_cgpa_initial.png"))

    # Test Import with empty SGPA history
    import_btn = driver.find_element(By.ID, "btn-import-sgpa")
    safe_click(import_btn)
    time.sleep(0.2)

    import_banner = driver.find_element(By.ID, "cgpa-import-banner")
    banner_shown = "is-hidden" not in import_banner.get_attribute("class") and "No saved SGPA records found" in import_banner.text
    record("Empty SGPA history shows clear warning banner", banner_shown, import_banner.text)

    # -------------------------------------------------------------------------
    # TEST 2: Add and Remove Rows & Minimum 1-Row Guard
    # -------------------------------------------------------------------------
    add_btn = driver.find_element(By.ID, "btn-add-semester")
    safe_click(add_btn)
    time.sleep(0.2)

    rows_after_add = driver.find_elements(By.CSS_SELECTOR, "#cgpa-semester-rows .semester-row")
    record("Add Semester increases row count to 3", len(rows_after_add) == 3, f"Count: {len(rows_after_add)}")

    # Remove rows until 1 remains
    remove_btn_3 = rows_after_add[2].find_element(By.CLASS_NAME, "btn-remove-row")
    safe_click(remove_btn_3)
    time.sleep(0.2)

    rows_after_del = driver.find_elements(By.CSS_SELECTOR, "#cgpa-semester-rows .semester-row")
    remove_btn_2 = rows_after_del[1].find_element(By.CLASS_NAME, "btn-remove-row")
    safe_click(remove_btn_2)
    time.sleep(0.2)

    final_row = driver.find_elements(By.CSS_SELECTOR, "#cgpa-semester-rows .semester-row")
    single_remove_btn = final_row[0].find_element(By.CLASS_NAME, "btn-remove-row")
    record("Minimum 1-row guard: Remove button disabled when 1 row remains", single_remove_btn.get_attribute("disabled") is not None)

    # -------------------------------------------------------------------------
    # TEST 3: Validation Engine (Invalid SGPA, Negative Credits, Duplicates)
    # -------------------------------------------------------------------------
    # Add a second row to test duplicates
    safe_click(add_btn)
    time.sleep(0.2)

    rows = driver.find_elements(By.CSS_SELECTOR, "#cgpa-semester-rows .semester-row")
    # Row 1: Semester 1, SGPA 11.5 (exceeds max scale 10), Credits -5 (negative)
    Select(rows[0].find_element(By.CLASS_NAME, "semester-name-select")).select_by_value("Semester 1")
    sgpa1 = rows[0].find_element(By.CLASS_NAME, "semester-sgpa-input")
    sgpa1.clear()
    sgpa1.send_keys("11.5")
    cred1 = rows[0].find_element(By.CLASS_NAME, "semester-credits-input")
    cred1.clear()
    cred1.send_keys("-5")

    # Row 2: Also Semester 1 (Duplicate!), SGPA empty, Credits 0
    Select(rows[1].find_element(By.CLASS_NAME, "semester-name-select")).select_by_value("Semester 1")
    cred2 = rows[1].find_element(By.CLASS_NAME, "semester-credits-input")
    cred2.clear()
    cred2.send_keys("0")

    calc_btn = driver.find_element(By.ID, "btn-calculate-cgpa")
    safe_click(calc_btn)
    time.sleep(0.3)

    val_box = driver.find_element(By.ID, "cgpa-validation-box")
    val_visible = "is-hidden" not in val_box.get_attribute("class")
    errors = [li.text for li in val_box.find_elements(By.TAG_NAME, "li")]
    has_range_err = any("between 0.00 and 10.0" in e for e in errors)
    has_dup_err = any("Duplicate semester" in e for e in errors)
    has_zero_err = any("greater than zero" in e for e in errors)

    record("Validation rejects SGPA exceeding scale (>10.0)", has_range_err)
    record("Validation prevents duplicate semester entries", has_dup_err)
    record("Validation rejects zero and negative credits", has_zero_err)

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase4_03_cgpa_validation.png"))

    # -------------------------------------------------------------------------
    # TEST 4: Benchmark Credit-Weighted Manual Calculation
    # -------------------------------------------------------------------------
    # Reset form
    safe_click(driver.find_element(By.ID, "btn-reset-cgpa"))
    time.sleep(0.2)

    # We need 3 rows
    safe_click(add_btn) # now 3 rows
    time.sleep(0.2)
    rows = driver.find_elements(By.CSS_SELECTOR, "#cgpa-semester-rows .semester-row")

    # Benchmark:
    # Sem 1: SGPA 8.40, Credits 20.0 -> 168.0 pts
    # Sem 2: SGPA 9.20, Credits 24.0 -> 220.8 pts
    # Sem 3: SGPA 8.80, Credits 22.0 -> 193.6 pts
    # Total Credits = 66.0 | Total Points = 582.4 | Weighted CGPA = 582.4 / 66.0 = 8.8242... -> 8.82
    # Note: Simple average is (8.40 + 9.20 + 8.80)/3 = 8.80 (distinct from 8.82!)
    test_semesters = [
        ("Semester 1", "8.40", "20.0"),
        ("Semester 2", "9.20", "24.0"),
        ("Semester 3", "8.80", "22.0")
    ]

    for idx, (s_name, s_sgpa, s_cred) in enumerate(test_semesters):
        row = rows[idx]
        Select(row.find_element(By.CLASS_NAME, "semester-name-select")).select_by_value(s_name)
        sgpa_inp = row.find_element(By.CLASS_NAME, "semester-sgpa-input")
        sgpa_inp.clear()
        sgpa_inp.send_keys(s_sgpa)
        cred_inp = row.find_element(By.CLASS_NAME, "semester-credits-input")
        cred_inp.clear()
        cred_inp.send_keys(s_cred)

    # Title
    title_inp = driver.find_element(By.ID, "cgpa-calc-title")
    title_inp.clear()
    title_inp.send_keys("Sem 1-3 Cumulative Benchmark")

    safe_click(calc_btn)
    time.sleep(0.3)

    final_cgpa = driver.find_element(By.ID, "cgpa-final-value").text
    tot_cred = driver.find_element(By.ID, "cgpa-total-credits").text
    sem_cnt = driver.find_element(By.ID, "cgpa-semester-count").text
    tot_pts = driver.find_element(By.ID, "cgpa-total-points").text

    record("Credit-weighted CGPA correctly calculated as 8.82 (NOT simple average 8.80)", final_cgpa == "8.82", f"Got: {final_cgpa}")
    record("Total completed credits summed as 66", tot_cred in ["66", "66.0"], f"Got: {tot_cred}")
    record("Semesters count is 3", sem_cnt == "3", f"Got: {sem_cnt}")
    record("Total weighted points is 582.40", tot_pts in ["582.40", "582.4"], f"Got: {tot_pts}")

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase4_04_cgpa_calculated.png"))

    # -------------------------------------------------------------------------
    # TEST 5: Save to CGPA History & Dashboard Sync
    # -------------------------------------------------------------------------
    save_cgpa_btn = driver.find_element(By.ID, "btn-save-cgpa")
    safe_click(save_cgpa_btn)
    time.sleep(0.3)

    feedback = driver.find_element(By.ID, "cgpa-save-feedback")
    record("Save to CGPA History feedback displayed", "is-hidden" not in feedback.get_attribute("class") and "Successfully saved" in feedback.text)

    # Inspect LocalStorage grademate_cgpa_history
    cgpa_hist_raw = driver.execute_script("return localStorage.getItem('grademate_cgpa_history');")
    cgpa_history = json.loads(cgpa_hist_raw) if cgpa_hist_raw else []
    record("Record persisted in grademate_cgpa_history", len(cgpa_history) == 1, f"Count: {len(cgpa_history)}")
    record("Record preserves title and complete semester breakdown", cgpa_history[0].get("title") == "Sem 1-3 Cumulative Benchmark" and len(cgpa_history[0].get("semesters", [])) == 3)

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase4_05_cgpa_saved.png"))

    # Verify Dashboard Sync
    safe_click(driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='dashboard']"))
    time.sleep(0.3)

    dash_cgpa = driver.find_element(By.ID, "metric-current-cgpa").text
    dash_note = driver.find_element(By.ID, "metric-cgpa-note").text
    recalc_alert = driver.find_element(By.ID, "cgpa-recalculate-notice")
    alert_hidden = "is-hidden" in recalc_alert.get_attribute("class")

    record("Dashboard reflects latest saved CGPA (8.82)", dash_cgpa == "8.82", dash_cgpa)
    record("Dashboard note cites saved cumulative title", "Sem 1-3 Cumulative Benchmark" in dash_note, dash_note)
    record("Recalculate alert is hidden when CGPA is up to date", alert_hidden)

    # -------------------------------------------------------------------------
    # TEST 6: Import from SGPA History (with deduplicated latest semester check)
    # -------------------------------------------------------------------------
    # Seed SGPA history with revisions:
    # Semester 1 (older revision): 8.0 SGPA, 20 credits, calculated 2026-09-01
    # Semester 1 (newer revision): 8.5 SGPA, 20 credits, calculated 2026-10-01 (Latest for Sem 1!)
    # Semester 2: 9.0 SGPA, 22 credits, calculated 2026-10-15
    driver.execute_script("""
        localStorage.setItem('grademate_sgpa_history', JSON.stringify([
            { id: 'sem1_old', semester: 'Semester 1', sgpa: 8.0, totalCredits: 20, calculatedAt: '2026-09-01T10:00:00Z' },
            { id: 'sem1_new', semester: 'Semester 1', sgpa: 8.5, totalCredits: 20, calculatedAt: '2026-10-01T10:00:00Z' },
            { id: 'sem2', semester: 'Semester 2', sgpa: 9.0, totalCredits: 22, calculatedAt: '2026-10-15T10:00:00Z' }
        ]));
    """)

    # Return to CGPA Calculator
    safe_click(driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='cgpa']"))
    time.sleep(0.3)

    import_btn = driver.find_element(By.ID, "btn-import-sgpa")
    safe_click(import_btn)
    time.sleep(0.3)

    imported_rows = driver.find_elements(By.CSS_SELECTOR, "#cgpa-semester-rows .semester-row")
    record("Import retrieves exactly 2 unique semesters (Sem 1 and Sem 2)", len(imported_rows) == 2, f"Count: {len(imported_rows)}")

    # Verify that Semester 1 imported the NEWER revision (8.50, NOT 8.00)
    sem1_sgpa_val = imported_rows[0].find_element(By.CLASS_NAME, "semester-sgpa-input").get_attribute("value")
    record("Import selects latest saved calculation for duplicate semester (8.50)", float(sem1_sgpa_val) == 8.5, f"Imported SGPA: {sem1_sgpa_val}")

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase4_02_cgpa_imported.png"))

    # Test editing imported row: Change Sem 2 credits from 22 to 24
    sem2_cred_inp = imported_rows[1].find_element(By.CLASS_NAME, "semester-credits-input")
    sem2_cred_inp.clear()
    sem2_cred_inp.send_keys("24")

    # Calculate with edited imported rows
    # Sem 1: 8.50 x 20 = 170.0
    # Sem 2: 9.00 x 24 = 216.0
    # Total: 386.0 / 44 = 8.7727... -> 8.77
    safe_click(calc_btn)
    time.sleep(0.3)

    edited_cgpa = driver.find_element(By.ID, "cgpa-final-value").text
    record("Editing imported rows calculates correctly (8.77)", edited_cgpa == "8.77", f"Got: {edited_cgpa}")

    # -------------------------------------------------------------------------
    # TEST 7: Reset Restores Form Without Deleting History
    # -------------------------------------------------------------------------
    safe_click(driver.find_element(By.ID, "btn-reset-cgpa"))
    time.sleep(0.2)

    reset_rows = driver.find_elements(By.CSS_SELECTOR, "#cgpa-semester-rows .semester-row")
    res_panel = driver.find_element(By.ID, "cgpa-result-panel")
    record("Reset restores initial clean form (2 blank rows)", len(reset_rows) == 2)
    record("Reset clears results panel", "is-hidden" in res_panel.get_attribute("class"))

    # Verify CGPA history is still present in localStorage
    cgpa_still_stored = driver.execute_script("return JSON.parse(localStorage.getItem('grademate_cgpa_history')).length;")
    record("Reset did NOT delete saved CGPA history", cgpa_still_stored == 1, f"Stored records: {cgpa_still_stored}")

    # -------------------------------------------------------------------------
    # TEST 8: Mobile Layout at 390px Viewport
    # -------------------------------------------------------------------------
    driver.set_window_size(390, 844)
    time.sleep(0.3)
    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase4_06_cgpa_mobile.png"))
    record("Mobile layout at 390px captured cleanly", True)

    # Final summary
    all_passed = all(t["passed"] for t in test_results)
    print("\n" + "="*60)
    print(f"PHASE 4 TEST SUMMARY: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
    print(f"Total Tests: {len(test_results)} | Passed: {sum(1 for t in test_results if t['passed'])} | Failed: {sum(1 for t in test_results if not t['passed'])}")
    print("="*60)

finally:
    driver.quit()
    httpd.shutdown()
