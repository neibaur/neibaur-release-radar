# BigQuery Release Radar 📡

A premium dashboard application built using **Python Flask**, **Vanilla JavaScript**, **Vanilla CSS**, and **HTML** that fetches, parses, and formats the live Google Cloud BigQuery Release Notes feed into structured components, enabling instant search and seamless sharing on Twitter/X.

---

## 🌟 Main Features

- **Granular Entry Parsing**: Splits combined daily release entries (which can bundle multiple updates) into individual, categorizable cards based on their update type (`Feature`, `Change`, `Announcement`, `Breaking`, `Issue`).
- **Glassmorphic Design**: A modern dark-mode dashboard styled with Google Fonts (Outfit & Inter), radial gradients, backdrop-filters, custom scrollbars, and micro-interactions.
- **Dynamic Statistics Counter**: An animated metrics bar calculating frequencies of parsed updates per category on load or refresh.
- **Real-Time Keyword & Tag Filters**: Fast client-side search indexing that filters results instantly as you type or select category tags.
- **Interactive Tweet Composer**:
  - Click any card's Twitter icon to open a custom composer modal.
  - Features a **live mock Twitter/X card preview** mirroring your edits.
  - Includes a **circular SVG progress indicator** that tracks the 280-character limit (turning yellow at 260, and red/disabling posting at 280).
- **One-Click Copy**: Automatically formats the release note, date, type, and its deep-link for instant pasting.
- **Live Synchronization**: Manual "Sync Feed" refresh button equipped with spinning loader animation and cached state updates.

---

## 📂 Project Structure

```text
agy-cli-projects/
├── app.py                # Flask Server & ElementTree XML Parser
├── requirements.txt      # Python packages (Flask, requests, bs4)
├── README.md             # Project documentation
├── templates/
│   └── index.html        # Glassmorphic layout structure
└── static/
    ├── css/
    │   └── styles.css    # Premium CSS design system & animations
    └── js/
        └── main.js       # Live search filters & Twitter composer sync
```

---

## 🌐 API Reference

### Get Release Notes
Retrieves the list of parsed release notes.

* **URL**: `/api/release-notes`
* **Method**: `GET`
* **Query Parameters**:
  * `refresh` (optional): Set to `true` to force a live fetch from Google Cloud, bypassing the cache.
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "last_fetched": "2026-06-16 10:47:19",
    "count": 68,
    "data": [
      {
        "id": "june_15_2026_feature_0",
        "category": "Feature",
        "date": "June 15, 2026",
        "html": "<p>Use Gemini Cloud Assist to analyze your SQL queries...</p>",
        "text": "Use Gemini Cloud Assist to analyze your SQL queries...",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_15_2026"
      }
    ]
  }
  ```

---

## 🚀 Setup & Execution

### Prerequisites
- Python 3.8+
- Active internet connection (for initial feed synchronization)

### 1. Install Dependencies
Navigate to the project directory and install the required libraries:
```bash
pip install -r requirements.txt
```

### 2. Run the Server
Launch the Flask development server:
```bash
python app.py
```

### 3. Open the Dashboard
Navigate to the following address in your browser:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**
