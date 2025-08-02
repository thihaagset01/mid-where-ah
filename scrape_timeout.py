from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time

def scrape_events(url):
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(service=ChromeService(), options=options)
    driver.get(url)
    print(f"Opening {url}")

    time.sleep(3)
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(5)

    wait = WebDriverWait(driver, 30)

    def event_titles_loaded(d):
        titles = d.find_elements(By.CSS_SELECTOR, "h4._h4_yhncw_1524")
        for t in titles:
            if t.text.strip():
                return True
        return False

    try:
        wait.until(event_titles_loaded)
        print("Event titles loaded.")
    except TimeoutException:
        print("Timeout waiting for event titles.")
        driver.quit()
        return []  # Return empty list on failure

    events = driver.find_elements(By.CSS_SELECTOR, "div._tile_p9ikb_1722")
    print(f"Found {len(events)} event tiles.")

    events_data = []

    for event in events:
        try:
            title = event.find_element(By.CSS_SELECTOR, "h4._h4_yhncw_1524").text.strip()
        except NoSuchElementException:
            title = ""

        try:
            date = event.find_element(By.CSS_SELECTOR, "span._date_n3hn3_1569").text.strip()
        except NoSuchElementException:
            date = ""

        try:
            desc = event.find_element(By.CSS_SELECTOR, "div._richText_yhncw_1617 p").text.strip()
        except NoSuchElementException:
            desc = ""

        try:
            url = event.find_element(By.CSS_SELECTOR, "a._fixHeight_n3hn3_1484").get_attribute("href")
        except NoSuchElementException:
            url = ""

        event_dict = {
            "title": title,
            "date": date,
            "description": desc,
            "url": url
        }
        events_data.append(event_dict)

    driver.quit()

    return events_data