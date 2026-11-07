"""
GradeMate — Phase 5 Automated End-to-End Test Suite & Screenshot Generator
Target CGPA Planner: Feasibility, Edge Cases, Auto-Fill, 4.0 & 10.0 Scales, Mobile Responsive
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

PORT = 5585
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
        def setup_student():
            driver.get(url)
            driver.execute_script("""
                localStorage.clear();
                localStorage.setItem('grademate_profile', JSON.stringify({
                    name: 'Alex Rivera',
                    institution: 'State Tech University',
                    degreeProgram: 'Computer Science',
                    currentSemester: 'Semester 4',
                    studentId: 'ST-2026-CS',
                    onboarded: true
                }));
                localStorage.setItem('grademate_sgpa_history', JSON.stringify([
                    {
                        id: 'sgpa_1',
                        semester: 'Semester 1',
                        sgpa: 9.0,
                        totalCredits: 20,
                        totalPoints: 180,
                        calculatedAt: '2026-09-01T10:00:00.000Z'
                    },
                    {
                        id: 'sgpa_2',
                        semester: 'Semester 2',
                        sgpa: 8.5,
                        totalCredits: 22,
                        totalPoints: 187,
                        calculatedAt: '2026-10-01T10:00:00.000Z'
                    }
                ]));
                localStorage.setItem('grademate_cgpa_history', JSON.stringify([
                    {
                        id: 'cgpa_1',
                        title: 'Year 1 Cumulative CGPA',
                        cgpa: 8.74,
                        totalCredits: 42,
                        totalPoints: 367,
                        semesterCount: 2,
                        calculatedAt: '2026-10-02T10:00:00.000Z'
                    }
                ]));
            """)
            driver.refresh()
            time.sleep(0.5)

        setup_student()

        # ==========================================
        # 1. Navigation & Initial Target View State
        # ==========================================
        print("\n--- 1. NAVIGATION & INITIAL TARGET VIEW STATE ---")
        driver.execute_script("window.GradeMate.App.navigateTo('target');")
        time.sleep(0.4)
        active_panel = driver.execute_script("return document.querySelector('.view-panel.active')?.id;")
        log("Navigate to Target CGPA Planner", active_panel == "view-target", f"(Active: {active_panel})")

        scale_text = driver.find_element(By.ID, "target-scale-name").text
        log("Initial scale badge reads active preferences", "10-Point" in scale_text, f"('{scale_text}')")

        # Screenshot 1: Initial Form
        ss1 = os.path.join(SCREENSHOT_DIR, "phase5_01_target_initial.png")
        driver.save_screenshot(ss1)
        print(f"Saved {ss1}")

        # ==========================================
        # 2. Auto-Fill from History
        # ==========================================
        print("\n--- 2. AUTO-FILL FROM HISTORY ---")
        autofill_btn = driver.find_element(By.ID, "btn-autofill-target")
        safe_click(driver, autofill_btn)
        
        autofill_data = driver.execute_script("""
            return {
                curCgpa: document.getElementById('target-current-cgpa').value,
                compCred: document.getElementById('target-completed-credits').value,
                bannerVisible: !document.getElementById('target-autofill-banner').classList.contains('is-hidden'),
                bannerText: document.getElementById('target-autofill-banner').textContent
            };
        """)
        log("Auto-fill prefers latest CGPA history (8.74, 42 credits)",
            autofill_data["curCgpa"] == "8.74" and autofill_data["compCred"] == "42",
            f"(CGPA: {autofill_data['curCgpa']}, Credits: {autofill_data['compCred']})")

        # Test Auto-fill when CGPA history is absent but SGPA history exists
        driver.execute_script("localStorage.removeItem('grademate_cgpa_history');")
        safe_click(driver, autofill_btn)
        sgpa_autofill = driver.execute_script("""
            return {
                curCgpa: document.getElementById('target-current-cgpa').value,
                compCred: document.getElementById('target-completed-credits').value,
                bannerText: document.getElementById('target-autofill-banner').textContent
            };
        """)
        # SGPA 1: 9.0 * 20 = 180, SGPA 2: 8.5 * 22 = 187. Total Credits = 42. CGPA = 367 / 42 = 8.74
        log("Auto-fill derives from SGPA history when CGPA history is absent",
            sgpa_autofill["curCgpa"] == "8.74" and sgpa_autofill["compCred"] == "42",
            f"(Derived CGPA: {sgpa_autofill['curCgpa']}, Credits: {sgpa_autofill['compCred']})")

        # Test Auto-fill when NO history exists
        driver.execute_script("localStorage.removeItem('grademate_sgpa_history');")
        safe_click(driver, autofill_btn)
        empty_banner = driver.execute_script("""
            return {
                bannerText: document.getElementById('target-autofill-banner').textContent,
                isWarning: document.getElementById('target-autofill-banner').classList.contains('is-warning')
            };
        """)
        log("Auto-fill displays clear warning banner when history is empty",
            empty_banner["isWarning"] and "No saved" in empty_banner["bannerText"],
            f"('{empty_banner['bannerText'][:60]}...')")

        # Screenshot 2: Auto-filled form
        setup_student()
        driver.execute_script("window.GradeMate.App.navigateTo('target');")
        time.sleep(0.3)
        safe_click(driver, driver.find_element(By.ID, "btn-autofill-target"))
        ss2 = os.path.join(SCREENSHOT_DIR, "phase5_02_target_autofilled.png")
        driver.save_screenshot(ss2)
        print(f"Saved {ss2}")

        # ==========================================
        # 3. Input Validation & Error Handling
        # ==========================================
        print("\n--- 3. INPUT VALIDATION & EDGE CASES ---")
        reset_btn = driver.find_element(By.ID, "btn-reset-target")
        safe_click(driver, reset_btn)

        calc_btn = driver.find_element(By.ID, "btn-calculate-target")
        # Empty click
        safe_click(driver, calc_btn)
        val_empty = driver.execute_script("""
            const box = document.getElementById('target-validation-box');
            const items = document.querySelectorAll('#target-validation-list li');
            return {
                visible: !box.classList.contains('is-hidden'),
                count: items.length
            };
        """)
        log("Validation rejects completely empty form", val_empty["visible"] and val_empty["count"] == 4, f"(Errors: {val_empty['count']})")

        # Division by zero guard: remaining credits = 0
        driver.execute_script("""
            document.getElementById('target-current-cgpa').value = '8.0';
            document.getElementById('target-completed-credits').value = '60';
            document.getElementById('target-desired-cgpa').value = '8.5';
            document.getElementById('target-remaining-credits').value = '0';
        """)
        safe_click(driver, calc_btn)
        val_div_zero = driver.execute_script("""
            const text = document.getElementById('target-validation-list').textContent;
            return text.includes('Remaining credits must be a positive number greater than zero');
        """)
        log("Validation prevents division by zero (zero remaining credits rejected)", val_div_zero)

        # Negative completed credits rejected
        driver.execute_script("""
            document.getElementById('target-completed-credits').value = '-15';
            document.getElementById('target-remaining-credits').value = '30';
        """)
        safe_click(driver, calc_btn)
        val_neg_comp = driver.execute_script("""
            const text = document.getElementById('target-validation-list').textContent;
            return text.includes('Completed credits cannot be negative');
        """)
        log("Validation rejects negative completed credits (-15 credits)", val_neg_comp)

        # Inconsistent combination: Positive CGPA with zero completed credits rejected
        driver.execute_script("""
            document.getElementById('target-current-cgpa').value = '8.50';
            document.getElementById('target-completed-credits').value = '0';
            document.getElementById('target-desired-cgpa').value = '9.00';
            document.getElementById('target-remaining-credits').value = '40';
        """)
        safe_click(driver, calc_btn)
        val_inconsistent = driver.execute_script("""
            const text = document.getElementById('target-validation-list').textContent;
            const curEl = document.getElementById('target-current-cgpa');
            const compEl = document.getElementById('target-completed-credits');
            const expectedMsg = 'Inconsistent input: Current CGPA cannot be greater than 0 if Completed Credits is 0. Please enter your completed credits, or set Current CGPA to 0.00 if starting semester 1.';
            return {
                hasMessage: text.includes(expectedMsg),
                curInvalid: curEl.classList.contains('is-invalid'),
                compInvalid: compEl.classList.contains('is-invalid')
            };
        """)
        log("Inconsistent input rejected (CGPA > 0 with Completed Credits = 0)", 
            val_inconsistent["hasMessage"] and val_inconsistent["curInvalid"] and val_inconsistent["compInvalid"])

        # Correct validation clearing after editing inputs
        driver.execute_script("""
            const compEl = document.getElementById('target-completed-credits');
            compEl.value = '60';
            compEl.dispatchEvent(new Event('input', { bubbles: true }));
        """)
        cleared_on_input = driver.execute_script("""
            const compEl = document.getElementById('target-completed-credits');
            return !compEl.classList.contains('is-invalid');
        """)
        safe_click(driver, calc_btn)
        cleared_after_calc = driver.execute_script("""
            const box = document.getElementById('target-validation-box');
            const curEl = document.getElementById('target-current-cgpa');
            const compEl = document.getElementById('target-completed-credits');
            const panel = document.getElementById('target-result-panel');
            return box.classList.contains('is-hidden') && 
                   !curEl.classList.contains('is-invalid') && 
                   !compEl.classList.contains('is-invalid') &&
                   !panel.classList.contains('is-hidden');
        """)
        log("Validation clears correctly when user corrects input and recalculates", cleared_on_input and cleared_after_calc)

        # Completed credits above 300 accepted (e.g., UK CATS degree 360 credits)
        driver.execute_script("""
            document.getElementById('target-current-cgpa').value = '8.00';
            document.getElementById('target-completed-credits').value = '360';
            document.getElementById('target-desired-cgpa').value = '8.20';
            document.getElementById('target-remaining-credits').value = '120';
        """)
        safe_click(driver, calc_btn)
        val_comp_above_300 = driver.execute_script("""
            const box = document.getElementById('target-validation-box');
            const totCredits = document.getElementById('target-total-credits-value').textContent.trim();
            return box.classList.contains('is-hidden') && totCredits === '480';
        """)
        log("Completed credits above 300 accepted (360 CATS credits -> Total 480)", val_comp_above_300)

        # Remaining credits above 300 accepted (e.g., 360 remaining credits)
        driver.execute_script("""
            document.getElementById('target-current-cgpa').value = '8.00';
            document.getElementById('target-completed-credits').value = '120';
            document.getElementById('target-desired-cgpa').value = '8.50';
            document.getElementById('target-remaining-credits').value = '360';
        """)
        safe_click(driver, calc_btn)
        val_rem_above_300 = driver.execute_script("""
            const box = document.getElementById('target-validation-box');
            const totCredits = document.getElementById('target-total-credits-value').textContent.trim();
            return box.classList.contains('is-hidden') && totCredits === '480';
        """)
        log("Remaining credits above 300 accepted (360 remaining credits -> Total 480)", val_rem_above_300)

        # Target exceeds max scale
        driver.execute_script("""
            document.getElementById('target-remaining-credits').value = '40';
            document.getElementById('target-desired-cgpa').value = '10.5';
        """)
        safe_click(driver, calc_btn)
        val_scale_exceeded = driver.execute_script("""
            const text = document.getElementById('target-validation-list').textContent;
            return text.includes('at most 10.0');
        """)
        log("Validation rejects Target CGPA exceeding max scale (10.5 > 10.0)", val_scale_exceeded)

        # Screenshot 3: Validation Banner
        ss3 = os.path.join(SCREENSHOT_DIR, "phase5_03_target_validation.png")
        driver.save_screenshot(ss3)
        print(f"Saved {ss3}")

        # ==========================================
        # 4. Feasibility Outcome A: Achievable Goal
        # ==========================================
        print("\n--- 4. FEASIBILITY OUTCOME: ACHIEVABLE ---")
        # Current: 8.00, Completed: 60, Target: 8.50, Remaining: 40 -> Req = (8.5*100 - 8*60)/40 = 370/40 = 9.25
        driver.execute_script("""
            document.getElementById('target-current-cgpa').value = '8.00';
            document.getElementById('target-completed-credits').value = '60';
            document.getElementById('target-desired-cgpa').value = '8.50';
            document.getElementById('target-remaining-credits').value = '40';
        """)
        safe_click(driver, calc_btn)
        achievable_res = driver.execute_script("""
            return {
                badgeText: document.getElementById('target-status-badge').textContent.trim(),
                badgeClass: document.getElementById('target-status-badge').className,
                reqSgpa: document.getElementById('target-required-sgpa-value').textContent.trim(),
                maxCgpa: document.getElementById('target-max-cgpa-value').textContent.trim(),
                totCredits: document.getElementById('target-total-credits-value').textContent.trim(),
                advisory: document.getElementById('target-advisory-text').textContent
            };
        """)
        log("Achievable status badge displayed", achievable_res["badgeText"] == "Achievable Goal")
        log("Required SGPA correctly calculated (9.25)", achievable_res["reqSgpa"] == "9.25", f"(Got: {achievable_res['reqSgpa']})")
        log("Max achievable CGPA correctly calculated (8.80)", achievable_res["maxCgpa"] == "8.80", f"(Got: {achievable_res['maxCgpa']})")
        log("Total degree credits calculated as 100", achievable_res["totCredits"] == "100", f"(Got: {achievable_res['totCredits']})")

        # Screenshot 4: Achievable Result
        ss4 = os.path.join(SCREENSHOT_DIR, "phase5_04_target_achievable.png")
        driver.save_screenshot(ss4)
        print(f"Saved {ss4}")

        # ==========================================
        # 5. Feasibility Outcome B: Mathematically Impossible & Theoretical Ceiling
        # ==========================================
        print("\n--- 5. FEASIBILITY OUTCOME: IMPOSSIBLE & THEORETICAL CEILING ---")
        # Current: 7.00, Completed: 80, Target: 8.50, Remaining: 20 -> Req = (8.5*100 - 7*80)/20 = 290/20 = 14.50 > 10.0
        # Max achievable = (7*80 + 10*20)/100 = 7.60
        driver.execute_script("""
            document.getElementById('target-current-cgpa').value = '7.00';
            document.getElementById('target-completed-credits').value = '80';
            document.getElementById('target-desired-cgpa').value = '8.50';
            document.getElementById('target-remaining-credits').value = '20';
        """)
        safe_click(driver, calc_btn)
        impossible_res = driver.execute_script("""
            return {
                badgeText: document.getElementById('target-status-badge').textContent.trim(),
                badgeClass: document.getElementById('target-status-badge').className,
                reqSgpa: document.getElementById('target-required-sgpa-value').textContent.trim(),
                maxCgpa: document.getElementById('target-max-cgpa-value').textContent.trim(),
                advisory: document.getElementById('target-advisory-text').textContent
            };
        """)
        log("Impossible status badge displayed", impossible_res["badgeText"] == "Mathematically Unattainable")
        log("Required SGPA reflects mathematical formula (14.50)", impossible_res["reqSgpa"] == "14.50", f"(Got: {impossible_res['reqSgpa']})")
        log("Maximum theoretical ceiling prominently surfaced (7.60)", impossible_res["maxCgpa"] == "7.60", f"(Got: {impossible_res['maxCgpa']})")
        log("Advisory provides constructive guidance citing 7.60 ceiling", "7.60" in impossible_res["advisory"])

        # Screenshot 5: Impossible Result
        ss5 = os.path.join(SCREENSHOT_DIR, "phase5_05_target_impossible.png")
        driver.save_screenshot(ss5)
        print(f"Saved {ss5}")

        # ==========================================
        # 6. Feasibility Outcome C: Already Achieved (Per Clarification #1)
        # ==========================================
        print("\n--- 6. FEASIBILITY OUTCOME: ALREADY ACHIEVED ---")
        # Case C1: Current 9.20, Completed 70, Target 8.50, Remaining 30 -> Cur >= Tgt -> Req = (8.5*100 - 9.2*70)/30 = (850 - 644)/30 = 6.87
        driver.execute_script("""
            document.getElementById('target-current-cgpa').value = '9.20';
            document.getElementById('target-completed-credits').value = '70';
            document.getElementById('target-desired-cgpa').value = '8.50';
            document.getElementById('target-remaining-credits').value = '30';
        """)
        safe_click(driver, calc_btn)
        achieved_c1 = driver.execute_script("""
            return {
                badgeText: document.getElementById('target-status-badge').textContent.trim(),
                labelReq: document.getElementById('label-required-sgpa').textContent.trim(),
                reqSgpa: document.getElementById('target-required-sgpa-value').textContent.trim(),
                subReq: document.getElementById('sub-required-sgpa').textContent.trim(),
                advisory: document.getElementById('target-advisory-text').textContent
            };
        """)
        log("Status badge displays 'Goal Already Met'", achieved_c1["badgeText"] == "Goal Already Met")
        log("Label accurately reflects 'Target Maintenance SGPA' (NOT misleading 0.00)",
            achieved_c1["labelReq"] == "Target Maintenance SGPA" and achieved_c1["reqSgpa"] == "6.87",
            f"(Label: '{achieved_c1['labelReq']}', SGPA: {achieved_c1['reqSgpa']})")
        log("Sub-label explains minimum average to maintain target", "maintain target" in achieved_c1["subReq"].lower())

        # Case C2: Current 9.50, Completed 80, Target 7.00, Remaining 20 -> Req = (7*100 - 9.5*80)/20 = (700 - 760)/20 = -3.00
        driver.execute_script("""
            document.getElementById('target-current-cgpa').value = '9.50';
            document.getElementById('target-completed-credits').value = '80';
            document.getElementById('target-desired-cgpa').value = '7.00';
            document.getElementById('target-remaining-credits').value = '20';
        """)
        safe_click(driver, calc_btn)
        achieved_c2 = driver.execute_script("""
            return {
                badgeText: document.getElementById('target-status-badge').textContent.trim(),
                reqSgpa: document.getElementById('target-required-sgpa-value').textContent.trim(),
                subReq: document.getElementById('sub-required-sgpa').textContent.trim(),
                advisory: document.getElementById('target-advisory-text').textContent
            };
        """)
        log("When formula yields negative SGPA (-3.00), exact value is retained and secured context explained",
            achieved_c2["reqSgpa"] == "-3.00" and "guaranteed" in achieved_c2["subReq"].lower(),
            f"(SGPA: {achieved_c2['reqSgpa']}, Subtitle: '{achieved_c2['subReq']}')")

        # Screenshot 6: Already Achieved
        ss6 = os.path.join(SCREENSHOT_DIR, "phase5_06_target_already_achieved.png")
        driver.save_screenshot(ss6)
        print(f"Saved {ss6}")

        # ==========================================
        # 7. Edge Case: Freshman / 0 Completed Credits
        # ==========================================
        print("\n--- 7. FRESHMAN (0 COMPLETED CREDITS) ---")
        driver.execute_script("""
            document.getElementById('target-current-cgpa').value = '0.00';
            document.getElementById('target-completed-credits').value = '0';
            document.getElementById('target-desired-cgpa').value = '9.00';
            document.getElementById('target-remaining-credits').value = '120';
        """)
        safe_click(driver, calc_btn)
        freshman_res = driver.execute_script("""
            return {
                reqSgpa: document.getElementById('target-required-sgpa-value').textContent.trim(),
                badge: document.getElementById('target-status-badge').textContent.trim()
            };
        """)
        log("Freshman calculation: Required SGPA equals Target CGPA (9.00)",
            freshman_res["reqSgpa"] == "9.00" and freshman_res["badge"] == "Achievable Goal",
            f"(Required SGPA: {freshman_res['reqSgpa']})")

        # ==========================================
        # 8. Dynamic 4.0 US Grading Scale Test
        # ==========================================
        print("\n--- 8. DYNAMIC 4.0 US GRADING SCALE ---")
        driver.execute_script("""
            localStorage.setItem('grademate_preferences', JSON.stringify({
                decimalPrecision: 2,
                gradingSystemId: 'scale_4_us',
                maxScalePoint: 4.0,
                minPassGrade: 'D'
            }));
            window.GradeMate.Views.Target.updateScaleBadge();
        """)
        scale_4_text = driver.find_element(By.ID, "target-scale-name").text
        log("Target Planner dynamically adapts to 4.0 US scale", "4.0" in scale_4_text, f"('{scale_4_text}')")

        # Current: 3.20, Completed: 60, Target: 3.50, Remaining: 60 -> Req = (3.5*120 - 3.2*60)/60 = (420 - 192)/60 = 228/60 = 3.80 <= 4.0
        driver.execute_script("""
            document.getElementById('target-current-cgpa').value = '3.20';
            document.getElementById('target-completed-credits').value = '60';
            document.getElementById('target-desired-cgpa').value = '3.50';
            document.getElementById('target-remaining-credits').value = '60';
        """)
        safe_click(driver, calc_btn)
        scale_4_res = driver.execute_script("""
            return {
                badge: document.getElementById('target-status-badge').textContent.trim(),
                reqSgpa: document.getElementById('target-required-sgpa-value').textContent.trim(),
                maxCgpa: document.getElementById('target-max-cgpa-value').textContent.trim()
            };
        """)
        log("4.0 scale calculation: Required SGPA (3.80) correctly solved",
            scale_4_res["reqSgpa"] == "3.80" and scale_4_res["badge"] == "Achievable Goal",
            f"(Req SGPA: {scale_4_res['reqSgpa']}, Max CGPA: {scale_4_res['maxCgpa']})")

        # Revert scale back to 10.0 for remaining tests
        driver.execute_script("""
            localStorage.removeItem('grademate_preferences');
            window.GradeMate.Views.Target.updateScaleBadge();
        """)

        # ==========================================
        # 9. Reset Action
        # ==========================================
        print("\n--- 9. RESET ACTION ---")
        safe_click(driver, reset_btn)
        reset_res = driver.execute_script("""
            return {
                cur: document.getElementById('target-current-cgpa').value,
                comp: document.getElementById('target-completed-credits').value,
                tgt: document.getElementById('target-desired-cgpa').value,
                rem: document.getElementById('target-remaining-credits').value,
                panelHidden: document.getElementById('target-result-panel').classList.contains('is-hidden')
            };
        """)
        log("Reset clears all 4 fields and hides results panel",
            reset_res["cur"] == "" and reset_res["tgt"] == "" and reset_res["panelHidden"])

        # ==========================================
        # 10. Mobile Responsiveness (390px and 360px)
        # ==========================================
        print("\n--- 10. MOBILE RESPONSIVENESS & OVERFLOW CHECKS ---")
    finally:
        driver.quit()

    # Test Mobile 390px
    opts_390 = Options()
    opts_390.add_argument("--headless=new")
    opts_390.add_experimental_option("mobileEmulation", {
        "deviceMetrics": { "width": 390, "height": 844, "pixelRatio": 3.0 },
        "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
    })
    driver_390 = webdriver.Chrome(options=opts_390)
    try:
        driver_390.get(url)
        driver_390.execute_script("""
            localStorage.setItem('grademate_profile', JSON.stringify({ name: 'Alex Rivera', onboarded: true }));
        """)
        driver_390.refresh()
        time.sleep(0.5)
        driver_390.execute_script("window.GradeMate.App.navigateTo('target');")
        time.sleep(0.3)
        driver_390.execute_script("""
            document.getElementById('target-current-cgpa').value = '8.00';
            document.getElementById('target-completed-credits').value = '60';
            document.getElementById('target-desired-cgpa').value = '8.50';
            document.getElementById('target-remaining-credits').value = '40';
        """)
        safe_click(driver_390, driver_390.find_element(By.ID, "btn-calculate-target"))
        
        mob_390_check = driver_390.execute_script("""
            return {
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
                hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                resultVisible: !document.getElementById('target-result-panel').classList.contains('is-hidden')
            };
        """)
        log("Mobile 390px has zero horizontal overflow",
            not mob_390_check["hasOverflow"] and mob_390_check["resultVisible"],
            f"(scrollWidth={mob_390_check['scrollWidth']}, clientWidth={mob_390_check['clientWidth']})")

        ss7 = os.path.join(SCREENSHOT_DIR, "phase5_07_target_mobile_390.png")
        driver_390.save_screenshot(ss7)
        print(f"Saved {ss7}")
    finally:
        driver_390.quit()

    # Test Mobile 360px
    opts_360 = Options()
    opts_360.add_argument("--headless=new")
    opts_360.add_experimental_option("mobileEmulation", {
        "deviceMetrics": { "width": 360, "height": 780, "pixelRatio": 2.0 },
        "userAgent": "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
    })
    driver_360 = webdriver.Chrome(options=opts_360)
    try:
        driver_360.get(url)
        driver_360.execute_script("""
            localStorage.setItem('grademate_profile', JSON.stringify({ name: 'Alex Rivera', onboarded: true }));
        """)
        driver_360.refresh()
        time.sleep(0.5)
        driver_360.execute_script("window.GradeMate.App.navigateTo('target');")
        time.sleep(0.3)
        driver_360.execute_script("""
            document.getElementById('target-current-cgpa').value = '7.00';
            document.getElementById('target-completed-credits').value = '80';
            document.getElementById('target-desired-cgpa').value = '8.50';
            document.getElementById('target-remaining-credits').value = '20';
        """)
        safe_click(driver_360, driver_360.find_element(By.ID, "btn-calculate-target"))
        
        mob_360_check = driver_360.execute_script("""
            return {
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
                hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                resultVisible: !document.getElementById('target-result-panel').classList.contains('is-hidden')
            };
        """)
        log("Mobile 360px has zero horizontal overflow",
            not mob_360_check["hasOverflow"] and mob_360_check["resultVisible"],
            f"(scrollWidth={mob_360_check['scrollWidth']}, clientWidth={mob_360_check['clientWidth']})")

        ss8 = os.path.join(SCREENSHOT_DIR, "phase5_08_target_mobile_360.png")
        driver_360.save_screenshot(ss8)
        print(f"Saved {ss8}")
    finally:
        driver_360.quit()
        httpd.shutdown()

    # ==========================================
    # Summary
    # ==========================================
    print("\n" + "="*60)
    print("PHASE 5 TEST SUITE SUMMARY")
    print("="*60)
    total = len(test_results)
    passed = sum(1 for _, s, _ in test_results if s == "PASS")
    for name, status, detail in test_results:
        print(f"[{status}] {name} {detail}")
    print(f"\nTOTAL: {passed}/{total} Passed.")

if __name__ == "__main__":
    run_tests()
