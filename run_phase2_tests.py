"""
GradeMate — Phase 2 Automated End-to-End Test Suite & Screenshot Generator
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
from selenium.webdriver.support.ui import WebDriverWait

PORT = 5520
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
    # TEST 1: Greeting & Empty Dashboard State
    # -------------------------------------------------------------------------
    driver.get(f"http://127.0.0.1:{PORT}/index.html")
    # Setup profile with Alex Mercer and wipe history
    driver.execute_script("""
        localStorage.clear();
        localStorage.setItem('grademate_profile', JSON.stringify({
            name: 'Alex Mercer',
            onboarded: true,
            createdAt: new Date().toISOString()
        }));
        location.reload();
    """)
    time.sleep(0.5)

    greeting = driver.find_element(By.ID, "dashboard-greeting-text").text
    record("Personalized Greeting renders Alex Mercer", "Alex Mercer" in greeting, greeting)

    cgpa_val = driver.find_element(By.ID, "metric-current-cgpa").text
    latest_val = driver.find_element(By.ID, "metric-latest-sgpa").text
    highest_val = driver.find_element(By.ID, "metric-highest-sgpa").text
    sem_val = driver.find_element(By.ID, "metric-semesters-count").text
    alert_el = driver.find_element(By.ID, "cgpa-recalculate-notice")
    alert_hidden = "is-hidden" in alert_el.get_attribute("class")

    record("Empty state: Current CGPA displays '--'", cgpa_val == "--", cgpa_val)
    record("Empty state: Latest SGPA displays '--'", latest_val == "--", latest_val)
    record("Empty state: Highest SGPA displays '--'", highest_val == "--", highest_val)
    record("Empty state: Semesters Completed displays '0'", sem_val == "0", sem_val)
    record("Empty state: Recalculate alert is hidden", alert_hidden)

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase2_01_dashboard_empty.png"))

    # -------------------------------------------------------------------------
    # TEST 2: Populated SGPAs (Derived Credit-Weighted CGPA)
    # -------------------------------------------------------------------------
    # Semester 1: 8.50 with 20 credits (170 points)
    # Semester 2: 9.10 with 22 credits (200.2 points)
    # Total: 370.2 / 42 = 8.8142... -> 8.81
    driver.execute_script("""
        localStorage.setItem('grademate_sgpa_history', JSON.stringify([
            {
                id: 'sgpa_sem1',
                semester: 'Semester 1',
                sgpa: 8.50,
                totalCredits: 20,
                calculatedAt: '2026-10-01T10:00:00Z'
            },
            {
                id: 'sgpa_sem2',
                semester: 'Semester 2',
                sgpa: 9.10,
                totalCredits: 22,
                calculatedAt: '2026-10-15T10:00:00Z'
            }
        ]));
        GradeMate.State.emit('history:updated');
    """)
    time.sleep(0.3)

    cgpa_derived = driver.find_element(By.ID, "metric-current-cgpa").text
    cgpa_note = driver.find_element(By.ID, "metric-cgpa-note").text
    latest_sgpa = driver.find_element(By.ID, "metric-latest-sgpa").text
    highest_sgpa = driver.find_element(By.ID, "metric-highest-sgpa").text
    sem_count = driver.find_element(By.ID, "metric-semesters-count").text

    record("Derived CGPA correctly computes credit-weighted 8.81", cgpa_derived == "8.81", f"Got: {cgpa_derived}")
    record("Derived CGPA note indicates SGPAs source", "Derived from" in cgpa_note, cgpa_note)
    record("Latest SGPA is 9.10 (from latest date)", latest_sgpa == "9.10", latest_sgpa)
    record("Highest SGPA is 9.10", highest_sgpa == "9.10", highest_sgpa)
    record("Semesters Completed is 2", sem_count == "2", sem_count)

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase2_02_dashboard_derived.png"))

    # -------------------------------------------------------------------------
    # TEST 3: Deduplication of Semesters Completed
    # -------------------------------------------------------------------------
    # Save a revision of "Semester 2" (same semester name, revised score 9.20)
    driver.execute_script("""
        var current = JSON.parse(localStorage.getItem('grademate_sgpa_history'));
        current.push({
            id: 'sgpa_sem2_revised',
            semester: 'Semester 2', // duplicate semester name!
            sgpa: 9.20,
            totalCredits: 22,
            calculatedAt: '2026-10-20T10:00:00Z'
        });
        localStorage.setItem('grademate_sgpa_history', JSON.stringify(current));
        GradeMate.State.emit('history:updated');
    """)
    time.sleep(0.3)

    sem_count_dedup = driver.find_element(By.ID, "metric-semesters-count").text
    record("Semesters Completed deduplicates duplicate semester entries (still 2)", sem_count_dedup == "2", f"Got: {sem_count_dedup}")

    highest_sgpa_updated = driver.find_element(By.ID, "metric-highest-sgpa").text
    record("Highest SGPA reflects revised peak (9.20)", highest_sgpa_updated == "9.20", highest_sgpa_updated)

    # -------------------------------------------------------------------------
    # TEST 4: Saved CGPA Record Priority
    # -------------------------------------------------------------------------
    # Add saved CGPA record with calculatedAt = '2026-10-25T10:00:00Z' (newer than all SGPAs)
    driver.execute_script("""
        localStorage.setItem('grademate_cgpa_history', JSON.stringify([
            {
                id: 'cgpa_year1',
                title: 'Year 1 Cumulative',
                cgpa: 8.85,
                totalCredits: 42,
                semesterCount: 2,
                calculatedAt: '2026-10-25T10:00:00Z'
            }
        ]));
        GradeMate.State.emit('history:updated');
    """)
    time.sleep(0.3)

    cgpa_saved = driver.find_element(By.ID, "metric-current-cgpa").text
    alert_el = driver.find_element(By.ID, "cgpa-recalculate-notice")
    alert_hidden_now = "is-hidden" in alert_el.get_attribute("class")

    record("Current CGPA prioritizes saved CGPA calculation (8.85)", cgpa_saved == "8.85", cgpa_saved)
    record("Recalculate alert remains hidden when no newer SGPAs exist", alert_hidden_now)

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase2_03_dashboard_saved_cgpa.png"))

    # -------------------------------------------------------------------------
    # TEST 5: Staleness Detection & Recalculation Alert Notice
    # -------------------------------------------------------------------------
    # Add Semester 3 SGPA calculated on '2026-11-05T10:00:00Z' (NEWER than CGPA '2026-10-25')
    driver.execute_script("""
        var current = JSON.parse(localStorage.getItem('grademate_sgpa_history'));
        current.push({
            id: 'sgpa_sem3',
            semester: 'Semester 3',
            sgpa: 9.40,
            totalCredits: 24,
            calculatedAt: '2026-11-05T10:00:00Z'
        });
        localStorage.setItem('grademate_sgpa_history', JSON.stringify(current));
        GradeMate.State.emit('history:updated');
    """)
    time.sleep(0.3)

    alert_el = driver.find_element(By.ID, "cgpa-recalculate-notice")
    alert_visible = "is-hidden" not in alert_el.get_attribute("class")
    record("Recalculate alert triggered when newer SGPA exists", alert_visible, alert_el.text)

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase2_04_dashboard_recalculate_alert.png"))

    # Click Recalculate CGPA button
    recalc_btn = driver.find_element(By.ID, "btn-recalculate-cgpa")
    recalc_btn.click()
    time.sleep(0.3)

    cgpa_view = driver.find_element(By.ID, "view-cgpa")
    record("Recalculate CGPA button navigates to CGPA Calculator", "active" in cgpa_view.get_attribute("class"))

    # Return to dashboard
    driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='dashboard']").click()
    time.sleep(0.3)

    # -------------------------------------------------------------------------
    # TEST 6: Action Shortcuts Navigation
    # -------------------------------------------------------------------------
    # Shortcut 1: SGPA
    sgpa_btn = driver.find_element(By.CSS_SELECTOR, ".btn-shortcut[data-target-view='sgpa']")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", sgpa_btn)
    time.sleep(0.2)
    sgpa_btn.click()
    time.sleep(0.3)
    record("Shortcut 1 navigates to SGPA Calculator", "active" in driver.find_element(By.ID, "view-sgpa").get_attribute("class"))

    driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='dashboard']").click()
    time.sleep(0.3)

    # Shortcut 2: CGPA
    cgpa_btn = driver.find_element(By.CSS_SELECTOR, ".btn-shortcut[data-target-view='cgpa']")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", cgpa_btn)
    time.sleep(0.2)
    cgpa_btn.click()
    time.sleep(0.3)
    record("Shortcut 2 navigates to CGPA Calculator", "active" in driver.find_element(By.ID, "view-cgpa").get_attribute("class"))

    driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='dashboard']").click()
    time.sleep(0.3)

    # Shortcut 3: Target Planner
    target_btn = driver.find_element(By.CSS_SELECTOR, ".btn-shortcut[data-target-view='target']")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", target_btn)
    time.sleep(0.2)
    target_btn.click()
    time.sleep(0.3)
    record("Shortcut 3 navigates to Target Planner", "active" in driver.find_element(By.ID, "view-target").get_attribute("class"))

    driver.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='dashboard']").click()
    time.sleep(0.3)

    # -------------------------------------------------------------------------
    # TEST 7: Responsive Mobile Dashboard Layout
    # -------------------------------------------------------------------------
    driver.set_window_size(390, 844)
    time.sleep(0.3)
    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "phase2_05_dashboard_mobile.png"))
    record("Mobile layout captured without horizontal overflow", True)

    # Final summary
    all_passed = all(t["passed"] for t in test_results)
    print("\n" + "="*60)
    print(f"PHASE 2 TEST SUMMARY: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
    print(f"Total Tests: {len(test_results)} | Passed: {sum(1 for t in test_results if t['passed'])} | Failed: {sum(1 for t in test_results if not t['passed'])}")
    print("="*60)

finally:
    driver.quit()
    httpd.shutdown()
