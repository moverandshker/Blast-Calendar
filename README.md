# Shared Calendar Display

A simple Flask web application to display a shared Exchange/Outlook calendar (via `.ics` URL) on a full-screen display, suitable for Raspberry Pi.

## Setup (on Raspberry Pi or Target Machine)

These instructions assume you are using a Debian-based Linux system like Raspberry Pi OS.

1.  **Install Git and Python Virtual Environment (if needed):**
    Open a terminal and run:
    ```bash
    sudo apt update && sudo apt install git python3-venv -y
    ```

2.  **Clone the repository:**
    Navigate to the directory where you want to place the project (e.g., your home directory) and run:
    ```bash
    git clone https://github.com/moverandshker/Blast-Calendar.git
    ```

3.  **Navigate into the project directory:**
    ```bash
    cd Blast-Calendar
    ```

4.  **Create a Python virtual environment:**
    ```bash
    python3 -m venv venv
    ```

5.  **Activate the virtual environment:**
    ```bash
    source venv/bin/activate
    ```
    *(Your terminal prompt should now show `(venv)` at the beginning)*

6.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

7.  **Configure the calendar URL:**
    *   Create and edit a file named `.env` using a text editor like `nano`:
        ```bash
        nano .env
        ```
    *   Add the following line to the file, replacing the placeholder with your **actual** `.ics` calendar link obtained from Outlook/Exchange:
        ```
        ICS_URL=https://your-calendar-link.ics
        ```
    *   Save the file (Ctrl+O, then Enter) and exit `nano` (Ctrl+X).

## Running the Application

1.  Make sure you are in the `Blast-Calendar` directory and your virtual environment (`venv`) is activated (you should see `(venv)` in your prompt).
2.  Run the Flask development server:
    ```bash
    python app.py
    ```
3.  The application will fetch the calendar data and start the server. You should see output indicating it's running on `http://127.0.0.1:5000/` or `http://0.0.0.0:5000/`.
4.  Open a web browser **on the Raspberry Pi** and navigate to `http://localhost:5000`.
5.  To access it from another device on the same network, find your Raspberry Pi's IP address (e.g., using `ip addr show`) and navigate to `http://<RaspberryPi_IP>:5000` in the browser on the other device.

## Features

### Seasonal Themes & Animations

The calendar automatically adjusts its appearance based on the current date to reflect different seasons and holidays:

*   **Color Schemes:** The header, buttons, and calendar grid change colors to match the active theme (e.g., orange/purple for Halloween, red/pink for Valentine's Day).
*   **Animations:** Certain themes include subtle background animations:
    *   Winter/Christmas: Falling snowflakes (❄️)
    *   Valentine's Day: Falling hearts (❤️)
    *   St. Patrick's Day: Falling shamrocks (☘️)
    *   Easter: Falling eggs (🥚)
    *   Spring: Falling flowers (🌸)
    *   Summer: Falling suns (☀️)
    *   Canada Day: Falling maple leaves (🍁)
    *   Autumn: Falling autumn leaves (🍂)
    *   Halloween: Falling bats (🦇)

The theme logic is determined in `app.py`, and the animations are handled by `static/script.js` and `static/style.css`.

## Full Screen Mode (Raspberry Pi / Kiosk)

To automatically run the browser in full-screen (kiosk) mode when the Raspberry Pi boots (assuming Raspberry Pi OS with desktop environment and Chromium):

1.  Edit the autostart file for the graphical session:
    ```bash
    nano ~/.config/lxsession/LXDE-pi/autostart
    ```
2.  Add the following lines at the end of the file:
    ```
    # Disable screensaver and power management
    @xset s noblank
    @xset s off
    @xset -dpms

    # Start Chromium in kiosk mode pointing to the locally running calendar app
    # Make sure the path to chromium-browser is correct for your system
    @chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:5000
    ```
    *Note: Ensure lines starting with `@lxpanel` and `@pcmanfm` are still present earlier in the file if they were there originally.*
3.  Save the file (Ctrl+O, Enter) and exit (Ctrl+X).
4.  Reboot the Raspberry Pi:
    ```bash
    sudo reboot
    ```
5.  After rebooting, the calendar application (which needs to be started separately first, see "Running the Application") should load automatically in the full-screen Chromium browser.

**Important:** For kiosk mode to work reliably on boot, you'll also need a way to automatically start the `python app.py` process itself when the Pi boots up *before* Chromium tries to access it. Common methods include using `systemd` services or `cron @reboot`. Setting up a `systemd` service is generally the recommended approach for background applications.
