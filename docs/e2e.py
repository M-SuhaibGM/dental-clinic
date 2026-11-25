# End-to-end UI test (Playwright for Python). Usage: pip install playwright && playwright install chromium
# Start the app on http://localhost:5000 with a freshly seeded DB (npm run db:reset && npm start), then: python docs/e2e.py
import re, sys
from playwright.sync_api import sync_playwright, expect
BASE="http://localhost:5000"; SS="docs/screenshots"
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1400,"height":900})
    pg.on("console", lambda m: m.type=="error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE); pg.wait_for_url("**/dashboard"); expect(pg.get_by_text("Total doctors")).to_be_visible()
    pg.screenshot(path=f"{SS}/01-dashboard.png", full_page=True)
    # Doctors list + search
    pg.get_by_role("navigation", name="Main").get_by_role("link", name="Doctors").click(); expect(pg.get_by_text("Dr. Ayesha Khan").first).to_be_visible()
    pg.screenshot(path=f"{SS}/02-doctors.png", full_page=True)
    pg.get_by_label("Search doctors").fill("zzz"); expect(pg.get_by_text("No matching doctors")).to_be_visible()
    pg.screenshot(path=f"{SS}/03-doctors-empty-search.png")
    pg.get_by_label("Search doctors").fill("")
    # Create doctor: client-side validation first
    pg.get_by_role("button", name="Add doctor").first.click(); pg.get_by_role("button", name="Add doctor").last.click()
    expect(pg.get_by_text("Name is required")).to_be_visible(); pg.screenshot(path=f"{SS}/04-doctor-form-validation.png")
    pg.get_by_label("Full name").fill("Dr. Kamal Hussain"); pg.get_by_label("Specialization").fill("Prosthodontics")
    pg.get_by_label("Email").fill("ayesha.khan@brightsmile.pk"); pg.get_by_label("Phone").fill("+92 333 7654321")
    pg.get_by_role("button", name="Add doctor").last.click()
    expect(pg.get_by_role("alert").filter(has_text="already exists")).to_be_visible()   # server-side error
    pg.screenshot(path=f"{SS}/05-doctor-form-server-error.png")
    pg.get_by_label("Email").fill("kamal.hussain@brightsmile.pk"); pg.get_by_role("button", name="Add doctor").last.click()
    expect(pg.get_by_text("Doctor created")).to_be_visible(); expect(pg.get_by_role("cell", name=re.compile("^Dr. Kamal Hussain"))).to_be_visible()
    # Edit doctor
    pg.get_by_role("button", name="Edit Dr. Kamal Hussain").click(); pg.get_by_label("Specialization").fill("Prosthodontics & Implants")
    pg.get_by_role("button", name="Save changes").click(); expect(pg.get_by_text("Doctor updated")).to_be_visible()
    expect(pg.get_by_text("Prosthodontics & Implants")).to_be_visible()
    # Delete doctor with appointments -> blocked
    pg.get_by_role("button", name="Delete Dr. Ayesha Khan").click(); pg.screenshot(path=f"{SS}/06-delete-confirm.png")
    pg.get_by_role("dialog").get_by_role("button", name="Delete").click(); expect(pg.get_by_text(re.compile("has \\d+ appointment"))).to_be_visible()
    # Delete new doctor -> ok
    pg.get_by_role("button", name="Delete Dr. Kamal Hussain").click(); pg.get_by_role("dialog").get_by_role("button", name="Delete").click()
    expect(pg.get_by_text("Doctor deleted")).to_be_visible(); expect(pg.get_by_role("cell", name=re.compile("^Dr. Kamal"))).to_have_count(0)
    # Detail view
    pg.get_by_role("cell", name=re.compile("^Dr. Sara Malik")).click(); expect(pg.get_by_text("Weekly availability")).to_be_visible()
    pg.screenshot(path=f"{SS}/07-doctor-detail.png", full_page=True)
    # Appointments
    pg.get_by_role("navigation", name="Main").get_by_role("link", name="Appointments").click(); expect(pg.get_by_role("heading", name="Appointments")).to_be_visible()
    expect(pg.get_by_text("Ali Hassan").first).to_be_visible(); pg.screenshot(path=f"{SS}/08-appointments.png", full_page=True)
    pg.get_by_label("Filter by status").select_option("pending"); pg.wait_for_url(re.compile("status=pending"))
    expect(pg.get_by_text("Ali Hassan")).to_have_count(0)
    pg.get_by_role("button", name="Clear").click()
    # Create with overlap -> server 409 shown in form
    pg.wait_for_timeout(3700)  # let earlier toasts disappear for a clean screenshot
    pg.get_by_role("button", name="New appointment").click()
    pg.get_by_role("dialog").get_by_label("Patient name").fill("Bilal Saeed"); pg.get_by_role("dialog").get_by_label("Phone").fill("+92 345 1112223")
    pg.get_by_role("dialog").get_by_label("Doctor").select_option(label="Dr. Ayesha Khan — General Dentistry")
    pg.get_by_role("dialog").get_by_label("Time").fill("09:15"); pg.get_by_role("dialog").get_by_label("Reason for visit").fill("Broken tooth")
    pg.get_by_role("button", name="Book appointment").click()
    expect(pg.get_by_role("alert").filter(has_text="Time slot overlaps")).to_be_visible(); pg.screenshot(path=f"{SS}/09-appointment-overlap.png")
    pg.get_by_role("dialog").get_by_label("Time").fill("11:00"); pg.get_by_role("button", name="Book appointment").click()
    expect(pg.get_by_text("Appointment created")).to_be_visible(); expect(pg.get_by_text("Bilal Saeed").first).to_be_visible()
    # Status update inline
    pg.get_by_label("Change status for Bilal Saeed").select_option("confirmed"); expect(pg.get_by_text("Status changed to confirmed")).to_be_visible()
    # Edit
    pg.get_by_role("button", name="Edit appointment for Bilal Saeed").click(); pg.get_by_role("dialog").get_by_label("Reason for visit").fill("Broken tooth – front incisor")
    pg.get_by_role("button", name="Save changes").click(); expect(pg.get_by_text("Appointment updated")).to_be_visible()
    expect(pg.get_by_text("Broken tooth – front incisor")).to_be_visible()
    # Delete
    pg.get_by_role("button", name="Delete appointment for Bilal Saeed").click(); pg.get_by_role("dialog").get_by_role("button", name="Delete").click()
    expect(pg.get_by_text("Appointment deleted")).to_be_visible(); expect(pg.get_by_text("Bilal Saeed")).to_have_count(0)
    # 404 page
    pg.goto(BASE+"/nope"); expect(pg.get_by_text("Page not found")).to_be_visible()
    # Mobile
    m=b.new_page(viewport={"width":390,"height":844}); m.goto(BASE+"/appointments"); expect(m.get_by_text("Ali Hassan").first).to_be_visible()
    m.screenshot(path=f"{SS}/10-mobile-appointments.png")
    m.get_by_label("Toggle navigation").click(); m.screenshot(path=f"{SS}/11-mobile-nav.png")
    b.close()
print("CONSOLE ERRORS:", [e for e in errors if "409" not in e and "400" not in e] or "none")
print("E2E PASSED")
