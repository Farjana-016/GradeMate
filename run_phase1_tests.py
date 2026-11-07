"""
GradeMate — Phase 1 Automated End-to-End Verification & Screenshot Capture
"""
import http.server
import socketserver
import threading
import time
import os
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

PORT = 5510
WORKSPACE_DIR = r"C:\Users\Hp\OneDrive\Documents\GradeMate"
SCREENSHOT_DIR = os.path.join(WORKSPACE_DIR, "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# 1. Start Background Local Server
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WORKSPACE_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

httpd = socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler)
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()
print(f"[OK] Local test server running on http://127.0.0.1:{PORT}")

# 2. Configure Chrome Headless
chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--window-size=1280,800")

driver = webdriver.Chrome(options=chrome_options)
wait = WebDriverWait(driver, 5)

test_results = []

def record_test(name, passed, details=""):
    test_results.append({"name": name, "passed": passed, "details": details})
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name} - {details}")

try:
    # -------------------------------------------------------------------------
    # TEST 1: Clean Visit & First-Time Onboarding
    # -------------------------------------------------------------------------
    driver.get(f"http://127.0.0.1:{PORT}/index.html")
    driver.execute_script("localStorage.clear(); location.reload();")
    time.sleep(0.5)

    onboarding = driver.find_element(By.ID, "onboarding-screen")
    app_shell = driver.find_element(By.CLASS_NAME, "app-shell")

    onboarding_visible = "is-hidden" not in onboarding.get_attribute("class")
    app_shell_hidden = "is-hidden" in app_shell.get_attribute("class")

    record_test("First-time visit shows Onboarding screen", onboarding_visible and app_shell_hidden)

    # Empty name submission validation
    submit_btn = driver.find_element(By.ID, "btn-get-started")
    submit_btn.click()
    time.sleep(0.2)

    feedback = driver.find_element(By.ID, "onboarding-feedback")
    is_invalid = "is-error" in feedback.get_attribute("class") and "Please enter your name" in feedback.text
    record_test("Validation catches empty student name", is_invalid, feedback.text)

    # Capture Onboarding Screenshots
    driver.set_window_size(1280, 800)
    time.sleep(0.3)
    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "01_onboarding_desktop.png"))

    driver.set_window_size(390, 844)
    time.sleep(0.3)
    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "02_onboarding_mobile.png"))

    # -------------------------------------------------------------------------
    # TEST 2: Onboarding Completion & LocalStorage Persistence
    # -------------------------------------------------------------------------
    driver.set_window_size(1280, 800)
    name_input = driver.find_element(By.ID, "student-name-input")
    name_input.clear()
    name_input.send_keys("Alex Mercer")
    submit_btn.click()
    time.sleep(0.4)

    stored_profile_raw = driver.execute_script("return localStorage.getItem('grademate_profile');")
    stored_profile = json.loads(stored_profile_raw) if stored_profile_raw else {}
    profile_saved = stored_profile.get("name") == "Alex Mercer" and stored_profile.get("onboarded") is True

    record_test("LocalStorage saves user profile correctly", profile_saved, str(stored_profile))

    onboarding_hidden = "is-hidden" in onboarding.get_attribute("class")
    app_shell_shown = "is-hidden" not in app_shell.get_attribute("class")
    record_test("Transition from Onboarding to App Shell", onboarding_hidden and app_shell_shown)

    # Verify Dashboard is active
    dashboard_panel = driver.find_element(By.ID, "view-dashboard")
    dashboard_active = "active" in dashboard_panel.get_attribute("class")
    record_test("Initial post-onboarding landing is Dashboard", dashboard_active)

    greeting_text = driver.find_element(By.ID, "dashboard-greeting-text").text
    record_test("Dynamic greeting incorporates student name", "Alex Mercer" in greeting_text, greeting_text)

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "03_dashboard_desktop.png"))

    # -------------------------------------------------------------------------
    # TEST 3: Navigation Across All 6 Sections (SPA without reloads)
    # -------------------------------------------------------------------------
    views_to_test = [
        ("sgpa", "view-sgpa", "SGPA Calculator", "04_sgpa_view.png"),
        ("cgpa", "view-cgpa", "CGPA Calculator", "05_cgpa_view.png"),
        ("target", "view-target", "Target CGPA Planner", "06_target_view.png"),
        ("history", "view-history", "Calculation History", "07_history_view.png"),
        ("settings", "view-settings", "Settings", "08_settings_view.png"),
        ("dashboard", "view-dashboard", "Dashboard", "03_dashboard_revisit.png"),
    ]

    for view_key, panel_id, nav_label, screenshot_name in views_to_test:
        link = driver.find_element(By.CSS_SELECTOR, f".nav-link[data-target-view='{view_key}']")
        link.click()
        time.sleep(0.25)

        panel = driver.find_element(By.ID, panel_id)
        is_panel_active = "active" in panel.get_attribute("class")
        is_link_active = "active" in link.get_attribute("class")
        record_test(f"SPA Navigation to '{nav_label}'", is_panel_active and is_link_active)

        if screenshot_name != "03_dashboard_revisit.png":
            driver.save_screenshot(os.path.join(SCREENSHOT_DIR, screenshot_name))

    # -------------------------------------------------------------------------
    # TEST 4: Mobile Responsive Navigation Drawer
    # -------------------------------------------------------------------------
    driver.set_window_size(390, 844)
    time.sleep(0.3)

    nav_toggle = driver.find_element(By.ID, "nav-toggle")
    main_nav = driver.find_element(By.ID, "main-nav")

    toggle_visible = nav_toggle.is_displayed()
    record_test("Mobile navigation hamburger button is visible", toggle_visible)

    nav_toggle.click()
    time.sleep(0.3)
    menu_open = "is-open" in main_nav.get_attribute("class")
    record_test("Mobile menu drawer opens on toggle click", menu_open)

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "09_mobile_menu_open.png"))

    # Click a link inside mobile drawer
    mobile_link = main_nav.find_element(By.CSS_SELECTOR, ".nav-link[data-target-view='dashboard']")
    mobile_link.click()
    time.sleep(0.3)

    menu_closed = "is-open" not in main_nav.get_attribute("class")
    record_test("Mobile menu drawer closes after link selection", menu_closed)

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "10_mobile_dashboard.png"))

    # -------------------------------------------------------------------------
    # TEST 5: Subsequent Visit Persistence (Bypass Onboarding on Refresh)
    # -------------------------------------------------------------------------
    driver.set_window_size(1280, 800)
    driver.refresh()
    time.sleep(0.5)

    onboarding_after_refresh = "is-hidden" in driver.find_element(By.ID, "onboarding-screen").get_attribute("class")
    app_shell_after_refresh = "is-hidden" not in driver.find_element(By.CLASS_NAME, "app-shell").get_attribute("class")
    record_test("Subsequent visit immediately loads App Shell without Onboarding", onboarding_after_refresh and app_shell_after_refresh)

    # -------------------------------------------------------------------------
    # TEST 6: Strict Design System & Branding Rules Audit
    # -------------------------------------------------------------------------
    nav_links = driver.find_elements(By.CSS_SELECTOR, ".nav-link")
    record_test("Exactly 6 navigation labels present", len(nav_links) == 6, f"Count: {len(nav_links)}")

    has_icons = any(len(link.find_elements(By.TAG_NAME, "svg")) > 0 or len(link.find_elements(By.TAG_NAME, "i")) > 0 or len(link.find_elements(By.TAG_NAME, "img")) > 0 for link in nav_links)
    record_test("Strict Text-Only Navigation (Zero Icons/Images in Nav)", not has_icons)

    # Check color styles
    body_bg = driver.execute_script("return window.getComputedStyle(document.body).backgroundColor;")
    card = driver.find_element(By.CLASS_NAME, "view-scaffold-card")
    card_bg = driver.execute_script("return window.getComputedStyle(arguments[0]).backgroundColor;", card)
    btn = driver.find_element(By.ID, "btn-get-started")
    btn_bg = driver.execute_script("return window.getComputedStyle(arguments[0]).backgroundColor;", btn)

    record_test("Body Background is Royal Violet #170D2B (rgb(23, 13, 43))", "23, 13, 43" in body_bg, body_bg)
    record_test("Card Background is #291744 (rgb(41, 23, 68))", "41, 23, 68" in card_bg, card_bg)
    record_test("Primary Button is Solid Purple Accent #7542C8 (rgb(117, 66, 200))", "117, 66, 200" in btn_bg, btn_bg)

    # Summary
    all_passed = all(t["passed"] for t in test_results)
    print("\n" + "="*60)
    print(f"PHASE 1 TEST SUMMARY: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
    print(f"Total Tests: {len(test_results)} | Passed: {sum(1 for t in test_results if t['passed'])} | Failed: {sum(1 for t in test_results if not t['passed'])}")
    print("="*60)

finally:
    driver.quit()
    httpd.shutdown()
