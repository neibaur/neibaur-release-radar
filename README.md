# BigQuery Release Radar 📡

A premium web application built using **Python Flask**, **Vanilla JavaScript**, **CSS**, and **HTML** that parses the live Google Cloud BigQuery Release Notes feed, visualizes update categories, and enables seamless sharing via Twitter/X.

## Features

- **Granular Update Parsing**: Automatically fetches the official Atom XML feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) and parses complex daily content blocks into separate, structured cards by update types (`Feature`, `Change`, `Announcement`, `Breaking`, `Issue`).
- **Modern Glassmorphic Dashboard**: A stunning dark-mode dashboard styled with Outfit and Inter typography, subtle gradients, backdrop-filters, and glowing elements.
- **Dynamic Stats Bar**: Real-time counter widgets tracking total items, features, issues, and change frequencies.
- **Instant Keyword Filter**: Search and filter updates instantly by key terms (e.g. `Gemini`, `UDF`, `Iceberg`, `April 2026`).
- **Category Filter Tabs**: Quick filtering of the feed by clicking on category tags (Features, Changes, Announcements, Breaking, Issues).
- **Interactive X (Twitter) Composer**: 
  - Click any card to launch a custom Twitter composer dialog.
  - Includes a **live mock Twitter card preview** that updates in real-time as you edit.
  - Integrated **character progress ring** and counter that warns you when approaching or exceeding the 280-character limit.
  - Single-click action to redirect to X's Web Intent API with pre-populated message contents.
- **Copy Text Action**: Single-button card copy action that formats the update and its deep-link for instant pasting.
- **State Synchronizer**: A manual "Sync Feed" refresh button equipped with spinning loader animation and cached state updates.

## Project Structure

```text
agy-cli-projects/
├── app.py                # Flask Server & ET Atom Parser
├── requirements.txt      # Project dependencies
├── templates/
│   └── index.html        # Glassmorphic layout structure
└── static/
    ├── css/
    │   └── styles.css    # Premium CSS design tokens & animations
    └── js/
        └── main.js       # Feed rendering, filtering, & Twitter preview sync
```

## Setup & Running Instructions

1. **Install Dependencies**: Make sure you have python installed, then run:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Server**: Start the Flask backend by running:
   ```bash
   python app.py
   ```

3. **Open the Application**: Open your browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)
