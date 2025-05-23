from flask import Flask, render_template, jsonify, request
import requests
from icalendar import Calendar
from datetime import datetime, timedelta, date
import pytz
import os
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

app = Flask(__name__)

# Cache for ICS data to avoid fetching on every request
# Simple implementation: stores the last fetched data and timestamp
# TODO: Add more robust caching (e.g., TTL - time to live)
_cache = {
    'data': None,
    'last_fetch_time': None,
    'url': None
}
FETCH_INTERVAL = timedelta(minutes=15)  # Fetch new data every 15 minutes

def fetch_and_parse_ics():
    """Fetches ICS data from the URL, parses it, and caches it."""
    global _cache
    now = datetime.now(pytz.utc)  # Use timezone-aware datetime
    ics_url = os.getenv('ICS_URL')

    if not ics_url:
        print("Error: ICS_URL not found in .env file.")
        return []

    # Check cache
    if (
        _cache['data'] and
        _cache['url'] == ics_url and
        _cache['last_fetch_time'] and
        (now - _cache['last_fetch_time'] < FETCH_INTERVAL)
    ):
        print("Using cached ICS data.")
        return _cache['data']

    print("Fetching fresh ICS data...")
    try:
        response = requests.get(ics_url, timeout=10)  # Added timeout
        response.raise_for_status()  # Raise an exception for bad status codes
        cal = Calendar.from_ical(response.text)
        events = []
        for component in cal.walk():
            if component.name == "VEVENT":
                # Extract dtstart and dtend
                dtstart = component.get('dtstart').dt
                dtend = component.get('dtend').dt

                # Handle timezone awareness
                # If the datetime object is naive (no timezone), assume UTC or a default timezone
                # If it has timezone info, convert it to UTC for consistency
                # For simplicity here, let's try converting to UTC if timezone info exists
                if isinstance(dtstart, datetime) and dtstart.tzinfo:
                    dtstart = dtstart.astimezone(pytz.utc)
                elif isinstance(dtstart, datetime):  # Naive datetime
                    # pass # Or assume a default timezone like pytz.timezone('Your/Timezone')
                    pass  # Keep as naive, filtering will use naive dates
                # Same for dtend
                if isinstance(dtend, datetime) and dtend.tzinfo:
                    dtend = dtend.astimezone(pytz.utc)
                elif isinstance(dtend, datetime):  # Naive datetime
                    pass

                # Ensure dtstart/dtend are either date or datetime objects
                start_iso = dtstart.isoformat() if isinstance(dtstart, (datetime, date)) else None
                end_iso = dtend.isoformat() if isinstance(dtend, (datetime, date)) else None

                event_data = {
                    'summary': str(component.get('summary', 'No Summary')),
                    'start': start_iso,
                    'end': end_iso,
                    'location': str(component.get('location', '')),
                    'description': str(component.get('description', ''))
                    # Add more fields as needed
                }
                events.append(event_data)

        print(f"Fetched and parsed {len(events)} events.")
        # Update cache
        _cache['data'] = events
        _cache['last_fetch_time'] = now
        _cache['url'] = ics_url
        return events
    except requests.exceptions.RequestException as e:
        print(f"Error fetching ICS URL: {e}")
        return []  # Return empty list on fetch error
    except Exception as e:
        print(f"Error parsing ICS data: {e}")
        # Optionally return cached data if parsing fails but cache exists
        # return _cache['data'] if _cache['data'] else []
        return []  # Return empty list on parsing error


def get_events_for_month(year, month):
    """Filters the cached events for a specific year and month."""
    all_events = fetch_and_parse_ics()
    if not all_events:
        return []

    # Define the start and end of the target month (naive date comparison)
    try:
        start_of_month = date(year, month, 1)
        # Find the first day of the next month, then subtract one day
        if month == 12:
            end_of_month = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_of_month = date(year, month + 1, 1) - timedelta(days=1)
    except ValueError:
        print(f"Invalid year/month combination: {year}-{month}")
        return []  # Invalid date requested

    print(f"Filtering events between {start_of_month} and {end_of_month}")
    filtered_events = []
    for event in all_events:
        if not event['start']:
            continue  # Skip events without a start date

        try:
            # Attempt to parse the ISO start date/datetime string
            event_start_dt = datetime.fromisoformat(event['start'].replace('Z', '+00:00'))  # Handle 'Z' for UTC

            # Convert to date for comparison (ignoring time part for month filtering)
            event_start_date = event_start_dt.date()

            # Basic check: event starts within the month
            if start_of_month <= event_start_date <= end_of_month:
                filtered_events.append(event)
                continue

            # TODO: Handle multi-day events spanning across month boundaries more accurately
            # This basic filter only includes events *starting* in the month.

        except (ValueError, TypeError) as e:
            # Handle cases where start is just a date (not datetime) or parsing fails
            try:
                event_start_date = date.fromisoformat(event['start'])
                if start_of_month <= event_start_date <= end_of_month:
                    filtered_events.append(event)
            except (ValueError, TypeError) as e2:
                print(f"Could not parse event start date '{event['start']}': {e}, {e2}")

    print(f"Found {len(filtered_events)} events for {year}-{month}")
    return filtered_events


@app.route('/')
def index():
    now = datetime.now()
    today = now.date() # Get today's date object
    current_year = today.year
    current_month = today.month # We'll use 'today' for checks now

    current_theme = 'default' # Start with default

    # 1. Define precise date-range checks (most specific first)
    #    Format: {'theme': name, 'start': (month, day), 'end': (month, day)}
    precise_theme_rules = [
        # Using approx. week before + day of
        {'theme': 'valentines', 'start': (2, 7),  'end': (2, 14)},
        {'theme': 'stpatricks', 'start': (3, 10), 'end': (3, 17)},
        # Canada Day spans months, handle carefully
        {'theme': 'canadaday',  'start': (6, 24), 'end': (7, 1)}, 
        {'theme': 'halloween',  'start': (10, 24),'end': (10, 31)},
        {'theme': 'christmas',  'start': (12, 18),'end': (12, 25)},
    ]

    for rule in precise_theme_rules:
        try:
            start_date = date(current_year, rule['start'][0], rule['start'][1])
            end_date = date(current_year, rule['end'][0], rule['end'][1])
            
            # Handle year wrap for end date if necessary (e.g., rule starts late Dec, ends early Jan - not needed for current rules)
            # if end_date < start_date: end_date = date(current_year + 1, rule['end'][0], rule['end'][1])

            if start_date <= today <= end_date:
                current_theme = rule['theme']
                break # Found the most specific theme, stop checking
        except ValueError: # Handle invalid dates like Feb 29 on non-leap year if needed
             continue # Skip rule if date is invalid for the year

    # 2. If no precise theme matched, check for month-long themes
    if current_theme == 'default':
        month_themes = {
            1: 'winter', 
            # Feb: Handled by valentines range
            # Mar: Handled by stpatricks range
            4: 'easter',    # Keeping Easter for whole month for simplicity
            5: 'spring',    # Spring starts May
            6: 'summer',    # Summer starts June (if not Canada Day week)
            # Jul: Handled by Canada Day range
            # Aug: Default
            9: 'autumn',    # Autumn starts Sept
            # Oct: Handled by Halloween range
            # Nov: Default
            # Dec: Handled by Christmas range
        }
        current_theme = month_themes.get(today.month, 'default')

    print(f"Current date: {today}, Theme determined as: {current_theme}")

    # Pass the current year, month, and theme to the template
    return render_template('index.html',
                           current_year=current_year,
                           current_month=today.month, # Pass original month for display
                           current_theme=current_theme)


@app.route('/events/<int:year>/<int:month>')
def api_events(year, month):
    # API endpoint to get events for a specific month
    events = get_events_for_month(year, month)
    return jsonify(events)


if __name__ == '__main__':
    # Use 0.0.0.0 to make it accessible on the network (e.g., from Raspberry Pi)
    # Turn off debug mode for any 'production' use on the Pi
    # Use debug=True only for local development (auto-reloads)
    # Check for an environment variable to control debug mode, default to False
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() in ['true', '1', 't']
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
