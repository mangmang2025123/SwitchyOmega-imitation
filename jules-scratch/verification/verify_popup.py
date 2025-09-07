from playwright.sync_api import sync_playwright
import os
import time

def main():
    user_data_dir = '/tmp/playwright_user_data_sync'
    # Get the absolute path of the current working directory
    extension_path = os.path.abspath(os.getcwd())

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=True,
            args=[
                f'--disable-extensions-except={extension_path}',
                f'--load-extension={extension_path}',
                # The following args are recommended for running in a containerized environment
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ]
        )

        service_worker = None
        # Increased retries and timeout for service worker to appear
        for i in range(20):
            if context.service_workers:
                service_worker = context.service_workers[0]
                break
            time.sleep(0.5)

        if not service_worker:
            print("Error: Service worker for the extension not found.")
            if context.pages:
                for i, page in enumerate(context.pages):
                    print(f"--- Content of page {i} ---")
                    try:
                        print(page.content())
                    except Exception as e:
                        print(f"Could not get page content: {e}")
            context.close()
            return

        extension_id = service_worker.url.split('/')[2]
        popup_url = f'chrome-extension://{extension_id}/popup.html'

        page = context.new_page()
        try:
            # Using 'domcontentloaded' can be faster and more reliable for local files
            page.goto(popup_url, wait_until='domcontentloaded')
            # Wait for a specific element to ensure the page is rendered
            page.wait_for_selector('#proxy-form')
            page.screenshot(path='jules-scratch/verification/verification.png')
            print("Screenshot taken successfully.")
        except Exception as e:
            print(f"An error occurred while taking screenshot: {e}")
        finally:
            context.close()

if __name__ == '__main__':
    main()
