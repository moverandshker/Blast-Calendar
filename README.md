# Shared Calendar Display

A simple Flask web application to display a shared Exchange/Outlook calendar (via `.ics` URL) on a full-screen display, suitable for Raspberry Pi.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    ```
    Activate it:
    *   Windows: `.\venv\Scripts\activate`
    *   macOS/Linux: `source venv/bin/activate`

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure the calendar URL:**
    *   Create a file named `.env` in the project root.
    *   Add the following line, replacing the placeholder with your actual `.ics` calendar link:
        ```
        ICS_URL=https://your-calendar-link.ics
        ```

## Running the Application

```bash
flask run
```

Or directly using Python:

```bash
python app.py
```

The application will be available at `http://localhost:5000` or `http://<your-pi-ip>:5000`.

## Features

*   Fetches events from a `.ics` URL.
*   Displays events in a monthly calendar view.
*   Navigation for previous/next month.
*   Designed for full-screen display (minimal UI elements).
