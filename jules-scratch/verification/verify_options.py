from playwright.sync_api import sync_playwright
import os
import time

def main():
    user_data_dir = '/tmp/playwright_user_data_sync'
    extension_path = os.path.abspath(os.getcwd())

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=True,
            args=[
                f'--disable-extensions-except={extension_path}',
                f'--load-extension={extension_path}',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ]
        )

        service_worker = None
        for i in range(20):
            if context.service_workers:
                service_worker = context.service_workers[0]
                break
            time.sleep(0.5)

        if not service_worker:
            print("Error: Service worker for the extension not found.")
            context.close()
            return

        extension_id = service_worker.url.split('/')[2]
        options_url = f'chrome-extension://{extension_id}/options.html'

        page = context.new_page()
        try:
            page.goto(options_url, wait_until='domcontentloaded')
            page.wait_for_selector('#profiles-section')
            page.wait_for_selector('#auto-switch-section')
            page.screenshot(path='jules-scratch/verification/options.png')
            print("Options page screenshot taken successfully.")
        except Exception as e:
            print(f"An error occurred while taking options screenshot: {e}")
        finally:
            context.close()

if __name__ == '__main__':
    main()
