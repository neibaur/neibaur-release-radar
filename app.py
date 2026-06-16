import re
import urllib.request
import logging
from flask import Flask, jsonify, render_template, request
import requests
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to store parsed release notes
# We store the list of updates and the last updated timestamp
cache = {
    "updates": [],
    "last_fetched": None
}

def parse_release_notes_html(content_html, date_str, base_link):
    """
    Parses the HTML content of a feed entry and splits it by <h3> tags
    into individual release note items.
    """
    soup = BeautifulSoup(content_html, 'html.parser')
    updates = []
    
    current_category = None
    current_description_elements = []
    item_index = 0
    
    def add_current_update():
        nonlocal item_index
        if current_category and current_description_elements:
            # Combine the elements back to HTML
            html_desc = "".join(str(el) for el in current_description_elements)
            # Use BeautifulSoup to get clean plain text description for tweeting
            text_desc = BeautifulSoup(html_desc, 'html.parser').get_text().strip()
            
            # Create a unique ID for this specific sub-update
            # We construct a clean slug for the category
            category_slug = current_category.lower().replace(" ", "_")
            unique_id = f"{date_str.lower().replace(' ', '_').replace(',', '')}_{category_slug}_{item_index}"
            
            # Clean up the HTML: make links open in a new tab
            desc_soup = BeautifulSoup(html_desc, 'html.parser')
            for a_tag in desc_soup.find_all('a'):
                a_tag['target'] = '_blank'
                a_tag['rel'] = 'noopener noreferrer'
                # If link is relative, make it absolute (Google Cloud docs base)
                if a_tag.get('href') and a_tag['href'].startswith('/'):
                    a_tag['href'] = "https://cloud.google.com" + a_tag['href']
            
            updates.append({
                'id': unique_id,
                'category': current_category,
                'html': str(desc_soup),
                'text': text_desc,
                'date': date_str,
                'link': f"{base_link}#{date_str.replace(' ', '_').replace(',', '')}"
            })
            item_index += 1

    for child in soup.contents:
        if child.name == 'h3':
            add_current_update()
            current_category = child.get_text().strip()
            current_description_elements = []
        elif child.name is not None:
            current_description_elements.append(child)
        elif isinstance(child, str) and child.strip():
            current_description_elements.append(child)
            
    # Add the last update
    add_current_update()
        
    return updates

def fetch_and_parse_feed():
    """
    Fetches the BigQuery Release Notes RSS Atom feed, parses it using ET,
    and returns a structured list of individual release notes.
    """
    import xml.etree.ElementTree as ET
    logger.info(f"Fetching release notes from: {FEED_URL}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(FEED_URL, headers=headers, timeout=10)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Error fetching feed: {e}")
        raise RuntimeError(f"Failed to fetch BigQuery release notes: {e}")

    try:
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('atom:entry', ns)
        
        all_updates = []
        for entry in entries:
            # Extract date
            title_elem = entry.find('atom:title', ns)
            date_str = title_elem.text.strip() if title_elem is not None else "Unknown Date"
            
            # Extract main link
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            if link_elem is None:
                link_elem = entry.find("atom:link", ns)
            link = link_elem.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            # Extract content HTML
            content_elem = entry.find('atom:content', ns)
            if content_elem is not None and content_elem.text:
                content_html = content_elem.text
                updates = parse_release_notes_html(content_html, date_str, link)
                all_updates.extend(updates)
            else:
                logger.warning(f"No content found in feed entry for date {date_str}")
        
        return all_updates

    except Exception as e:
        logger.error(f"Error parsing feed XML: {e}")
        raise RuntimeError(f"Failed to parse BigQuery release notes XML: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or not cache["updates"] or not cache["last_fetched"]:
        try:
            updates = fetch_and_parse_feed()
            cache["updates"] = updates
            # Format timestamp for frontend
            from datetime import datetime
            cache["last_fetched"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500
            
    return jsonify({
        "status": "success",
        "last_fetched": cache["last_fetched"],
        "count": len(cache["updates"]),
        "data": cache["updates"]
    })

if __name__ == '__main__':
    # Fetch once on startup so initial load is fast
    try:
        logger.info("Performing initial feed fetch...")
        cache["updates"] = fetch_and_parse_feed()
        from datetime import datetime
        cache["last_fetched"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"Successfully loaded {len(cache['updates'])} release notes.")
    except Exception as e:
        logger.error(f"Failed to perform initial fetch: {e}")
        
    app.run(debug=True, host='127.0.0.1', port=5000)
