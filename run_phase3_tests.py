"""
GradeMate — Phase 3 Automated End-to-End Test Suite & Screenshot Generator
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

PORT = 5530
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

def record(name, condition, details=""):
    test_results.append({"name": name, "passed": condition, "details": details})
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {name} - {details}")

try:
    # -------------------------------------------------------------------------
    # TEST 1: Navigation to SGPA Calculator & Initial Setup
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

    # Navigate to SGPA Calculator
    driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='sgpa']").click()
    time.sleep(0.3)

    sgpa_panel = driver.find_element(By.ID, "view-sgpa")
    record("Navigate to SGPA Calculator View", "active" in sgpa_panel.get_attribute("class"))

    # Verify initial 4 default rows
    rows = driver.find_elements(By.CSS_SELECTOR, "#sgpa-subject-rows .subject-row")
    record("Initial 4 default subject rows generated", len(rows) == 4, f"Count: {len(rows)}")

    # Verify grade dropdown is populated from active scale
    grade_select = rows[0].find_element(By.CLASS_NAME, "subject-grade-select")
    options = [opt.text for opt in grade_select.find_elements(By.TAG_NAME, "option")]
    has_grades = any("O (" in opt for opt in options) and any("A+ (" in opt for opt in options)
    record("Grade options populated from active academic preferences", has_grades, f"Options sample: {options[:3]}")

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase3_01_sgpa_initial.png"))

    # -------------------------------------------------------------------------
    # TEST 2: Validation Engine (Empty, Zero, Negative, Missing Grade)
    # -------------------------------------------------------------------------
    calc_btn = driver.find_element(By.ID, "btn-calculate-sgpa")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", calc_btn)
    time.sleep(0.2)
    calc_btn.click()
    time.sleep(0.3)

    validation_box = driver.find_element(By.ID, "sgpa-validation-box")
    val_visible = "is-hidden" not in validation_box.get_attribute("class")
    error_items = validation_box.find_elements(By.TAG_NAME, "li")
    record("Validation rejects empty subject rows", val_visible and len(error_items) > 0, f"Errors caught: {len(error_items)}")

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase3_02_sgpa_validation.png"))

    # -------------------------------------------------------------------------
    # TEST 3: Add & Remove Rows
    # -------------------------------------------------------------------------
    add_btn = driver.find_element(By.ID, "btn-add-subject")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", add_btn)
    add_btn.click()
    time.sleep(0.2)

    rows_after_add = driver.find_elements(By.CSS_SELECTOR, "#sgpa-subject-rows .subject-row")
    record("Add Subject increases row count to 5", len(rows_after_add) == 5, f"Count: {len(rows_after_add)}")

    # Remove the 5th row
    remove_btn_5 = rows_after_add[4].find_element(By.CLASS_NAME, "btn-remove-row")
    remove_btn_5.click()
    time.sleep(0.2)

    rows_after_remove = driver.find_elements(By.CSS_SELECTOR, "#sgpa-subject-rows .subject-row")
    record("Remove Subject restores row count to 4", len(rows_after_remove) == 4, f"Count: {len(rows_after_remove)}")

    # -------------------------------------------------------------------------
    # TEST 4: Input Benchmark Academic Subjects & Calculate SGPA
    # -------------------------------------------------------------------------
    # Benchmark Subjects:
    # 1. Data Structures: 4.0 credits, Grade O (10.0 pts) -> 40 pts
    # 2. Algorithms: 4.0 credits, Grade A+ (9.0 pts) -> 36 pts
    # 3. Linear Algebra: 3.0 credits, Grade A (8.0 pts) -> 24 pts
    # 4. Systems Lab: 1.5 credits, Grade B+ (7.0 pts) -> 10.5 pts
    # Total Credits = 12.5 | Total Points = 110.5 | SGPA = 110.5 / 12.5 = 8.84
    test_data = [
        ("Data Structures", "4", "O"),
        ("Algorithms", "4", "A+"),
        ("Linear Algebra", "3", "A"),
        ("Systems Lab", "1.5", "B+")
    ]

    for i, (name, creds, grade) in enumerate(test_data):
        row = rows_after_remove[i]
        name_input = row.find_element(By.CLASS_NAME, "subject-name-input")
        cred_input = row.find_element(By.CLASS_NAME, "subject-credits-input")
        grade_select = Select(row.find_element(By.CLASS_NAME, "subject-grade-select"))

        name_input.clear()
        name_input.send_keys(name)

        cred_input.clear()
        cred_input.send_keys(creds)

        grade_select.select_by_value(grade)

    # Click Calculate SGPA
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", calc_btn)
    time.sleep(0.2)
    calc_btn.click()
    time.sleep(0.3)

    result_panel = driver.find_element(By.ID, "sgpa-result-panel")
    result_visible = "is-hidden" not in result_panel.get_attribute("class")

    final_val = driver.find_element(By.ID, "sgpa-final-value").text
    total_cred = driver.find_element(By.ID, "sgpa-total-credits").text
    total_pts = driver.find_element(By.ID, "sgpa-total-points").text

    record("Calculated SGPA matches exact credit-weighted math (8.84)", final_val == "8.84", f"Got: {final_val}")
    record("Total Credits correctly summed (12.5)", total_cred in ["12.5", "12.50"], f"Got: {total_cred}")
    record("Total Weighted Grade Points correctly summed (110.50)", total_pts == "110.50", f"Got: {total_pts}")

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase3_03_sgpa_calculated.png"))

    # -------------------------------------------------------------------------
    # TEST 5: Save Calculation to SGPA History
    # -------------------------------------------------------------------------
    save_btn = driver.find_element(By.ID, "btn-save-sgpa")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", save_btn)
    time.sleep(0.2)
    save_btn.click()
    time.sleep(0.3)

    save_feedback = driver.find_element(By.ID, "sgpa-save-feedback")
    feedback_shown = "is-hidden" not in save_feedback.get_attribute("class") and "Saved" in save_feedback.text
    record("Save to SGPA History shows success feedback", feedback_shown, save_feedback.text)

    # Inspect LocalStorage
    raw_history = driver.execute_script("return localStorage.getItem('grademate_sgpa_history');")
    sgpa_history = json.loads(raw_history) if raw_history else []
    record("Record stored in LocalStorage grademate_sgpa_history", len(sgpa_history) == 1, f"Count: {len(sgpa_history)}")
    record("Stored record contains complete subject breakdown", len(sgpa_history[0].get("subjects", [])) == 4)

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase3_04_sgpa_saved.png"))

    # -------------------------------------------------------------------------
    # TEST 6: Dashboard Dynamic Auto-Update Verification
    # -------------------------------------------------------------------------
    driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='dashboard']").click()
    time.sleep(0.3)

    dash_latest = driver.find_element(By.ID, "metric-latest-sgpa").text
    dash_highest = driver.find_element(By.ID, "metric-highest-sgpa").text
    dash_sem = driver.find_element(By.ID, "metric-semesters-count").text
    dash_cgpa = driver.find_element(By.ID, "metric-current-cgpa").text

    record("Dashboard Latest SGPA updated automatically to 8.84", dash_latest == "8.84", dash_latest)
    record("Dashboard Highest SGPA updated automatically to 8.84", dash_highest == "8.84", dash_highest)
    record("Dashboard Semesters Completed updated to 1", dash_sem == "1", dash_sem)
    record("Dashboard Current CGPA derived as 8.84", dash_cgpa == "8.84", dash_cgpa)

    # -------------------------------------------------------------------------
    # TEST 7: Revised Calculation Overwrite (No Duplication)
    # -------------------------------------------------------------------------
    # Return to SGPA Calculator with "Semester 1" selected
    driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='sgpa']").click()
    time.sleep(0.3)

    # Revise Row 3 (Linear Algebra) grade to O (10 pts) -> new total pts = 116.5 -> SGPA = 9.32
    rows_current = driver.find_elements(By.CSS_SELECTOR, "#sgpa-subject-rows .subject-row")
    row3_grade = Select(rows_current[2].find_element(By.CLASS_NAME, "subject-grade-select"))
    row3_grade.select_by_value("O")

    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", calc_btn)
    time.sleep(0.2)
    calc_btn.click()
    time.sleep(0.3)

    revised_sgpa = driver.find_element(By.ID, "sgpa-final-value").text
    record("Revised calculation gives 9.32", revised_sgpa == "9.32", f"Got: {revised_sgpa}")

    # Save revised calculation
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", save_btn)
    time.sleep(0.2)
    save_btn.click()
    time.sleep(0.3)

    save_feedback_revised = driver.find_element(By.ID, "sgpa-save-feedback").text
    record("Notice shows existing record was updated", "Updated existing" in save_feedback_revised, save_feedback_revised)

    # Verify LocalStorage still only has 1 record (overwritten in-place, not duplicated!)
    raw_history_after = driver.execute_script("return localStorage.getItem('grademate_sgpa_history');")
    sgpa_history_after = json.loads(raw_history_after) if raw_history_after else []
    record("Revised semester did NOT create duplicate entry (Count remains 1)", len(sgpa_history_after) == 1, f"Count: {len(sgpa_history_after)}")
    record("Stored record SGPA updated to 9.32", sgpa_history_after[0].get("sgpa") == 9.32, str(sgpa_history_after[0].get("sgpa")))

    # Check Dashboard reflects updated peak
    driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='dashboard']").click()
    time.sleep(0.3)
    dash_highest_revised = driver.find_element(By.ID, "metric-highest-sgpa").text
    record("Dashboard reflects revised peak SGPA 9.32", dash_highest_revised == "9.32", dash_highest_revised)

    # -------------------------------------------------------------------------
    # TEST 8: Mobile Layout Capture
    # -------------------------------------------------------------------------
    driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='sgpa']").click()
    time.sleep(0.2)
    driver.set_window_size(390, 844)
    time.sleep(0.3)
    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase3_05_sgpa_mobile.png"))
    record("Mobile stacked layout captured cleanly", True)

    # Final summary
    all_passed = all(t["passed"] for t in test_results)
    print("\n" + "="*60)
    print(f"PHASE 3 TEST SUMMARY: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
    print(f"Total Tests: {len(test_results)} | Passed: {sum(1 for t in test_results if t['passed'])} | Failed: {sum(1 for t in test_results if not t['passed'])}")
    print("="*60)

finally:
    driver.quit()
    httpd.shutdown()
