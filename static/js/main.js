// App state
let allNotes = [];
let activeFilter = 'all';
let searchQuery = '';
let currentNoteForTweet = null;
let sortOrder = 'newest';

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const refreshBtn = document.getElementById('refresh-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeToggle = document.getElementById('checkbox');
const syncTimeSpan = document.getElementById('sync-time');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterTags = document.querySelectorAll('.filter-tag');
const sortSelect = document.getElementById('sort-select');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const resultsCountDiv = document.getElementById('results-count');

// Stats Counters
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statIssuesBreaking = document.getElementById('stat-issues-breaking');
const statChanges = document.getElementById('stat-changes');

// Twitter Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const publishTweetBtn = document.getElementById('publish-tweet-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountSpan = document.getElementById('char-count');
const progressIndicator = document.getElementById('progress-indicator');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const previewLinkTitle = document.getElementById('preview-link-title');

// Toast Elements
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Circle indicator configuration
const circleRadius = 10;
const circleCircumference = 2 * Math.PI * circleRadius;

// Initialize circular progress ring
if (progressIndicator) {
    progressIndicator.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
    progressIndicator.style.strokeDashoffset = circleCircumference;
}

// Map categories to standard classes
const categoryClassMap = {
    'feature': 'feature',
    'change': 'change',
    'announcement': 'announcement',
    'breaking': 'breaking',
    'issue': 'issue'
};

// Start application
document.addEventListener('DOMContentLoaded', () => {
    // Check local storage for theme preference
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light-theme') {
        document.body.classList.add('light-theme');
        if (themeToggle) themeToggle.checked = true;
    }
    
    fetchReleaseNotes(false);
    setupEventListeners();
});

// Event Listeners setup
function setupEventListeners() {
    // Refresh button
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Theme toggle switch
    if (themeToggle) {
        themeToggle.addEventListener('change', function(e) {
            if (e.target.checked) {
                document.body.classList.add('light-theme');
                localStorage.setItem('theme', 'light-theme');
                showToast("Switched to Light Mode!");
            } else {
                document.body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark-theme');
                showToast("Switched to Dark Mode!");
            }
        });
    }
    
    // Export CSV button
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }
    
    // Sort selection change
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortOrder = e.target.value;
            filterAndRenderNotes();
        });
    }
    
    // Retry error button
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search input
    searchInput.addEventListener('input', handleSearch);
    
    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        searchQuery = '';
        filterAndRenderNotes();
        searchInput.focus();
    });
    
    // Tag filters
    filterTags.forEach(tag => {
        tag.addEventListener('click', (e) => {
            filterTags.forEach(t => t.classList.remove('active'));
            const clickedTag = e.currentTarget;
            clickedTag.classList.add('active');
            activeFilter = clickedTag.getAttribute('data-filter');
            filterAndRenderNotes();
        });
    });
    
    // Close modal actions
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Tweet textarea auto-counter & sync preview
    tweetTextarea.addEventListener('input', updateTweetComposerStatus);
    
    // Publish tweet button
    publishTweetBtn.addEventListener('click', submitTweet);
    
    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetModal();
        }
    });
}

// Fetch release notes from backend
async function fetchReleaseNotes(forceRefresh = false) {
    setLoadingState(true);
    errorContainer.style.display = 'none';
    
    const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server returned HTTP status ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            allNotes = result.data;
            syncTimeSpan.textContent = result.last_fetched;
            updateStats();
            filterAndRenderNotes();
            
            if (forceRefresh) {
                showToast("Release notes synchronized successfully!");
            }
        } else {
            throw new Error(result.message || "Unknown error occurred while parsing");
        }
    } catch (err) {
        console.error("Fetch error:", err);
        errorMessage.textContent = err.message;
        errorContainer.style.display = 'flex';
        feedContainer.innerHTML = '';
        resultsCountDiv.textContent = 'Error loading feed';
    } finally {
        setLoadingState(false);
    }
}

// Loading Spinner toggler
function setLoadingState(isLoading) {
    const icon = refreshBtn.querySelector('.refresh-icon');
    const span = refreshBtn.querySelector('span');
    
    if (isLoading) {
        refreshBtn.disabled = true;
        icon.classList.add('spinning');
        span.textContent = 'Syncing...';
        
        // If initial load or list was empty, show skeleton loaders
        if (allNotes.length === 0) {
            feedContainer.innerHTML = getSkeletonHTML(3);
        }
    } else {
        refreshBtn.disabled = false;
        icon.classList.remove('spinning');
        span.textContent = 'Sync Feed';
    }
}

// Update Dashboard Statistics Card figures
function updateStats() {
    let features = 0;
    let issuesBreaking = 0;
    let changes = 0;
    
    allNotes.forEach(note => {
        const cat = note.category.toLowerCase();
        if (cat.includes('feature')) {
            features++;
        } else if (cat.includes('issue') || cat.includes('breaking')) {
            issuesBreaking++;
        } else {
            changes++;
        }
    });
    
    // Animate stats numbers
    animateNumber(statTotal, allNotes.length);
    animateNumber(statFeatures, features);
    animateNumber(statIssuesBreaking, issuesBreaking);
    animateNumber(statChanges, changes);
}

// Helper to animate count-up numbers
function animateNumber(element, target) {
    const duration = 800; // ms
    const startTime = performance.now();
    const startVal = parseInt(element.textContent) || 0;
    
    if (startVal === target) {
        element.textContent = target;
        return;
    }
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing out quadratic
        const easeProgress = progress * (2 - progress);
        const currentVal = Math.floor(startVal + (target - startVal) * easeProgress);
        
        element.textContent = currentVal;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    }
    
    requestAnimationFrame(update);
}

// Handle keyword search input
function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    
    if (searchQuery.length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    
    filterAndRenderNotes();
}

// Filter and render updates list
function filterAndRenderNotes() {
    let filtered = allNotes;
    
    // Apply type category filter tag
    if (activeFilter !== 'all') {
        filtered = filtered.filter(note => {
            const cat = note.category.toLowerCase();
            return cat === activeFilter;
        });
    }
    
    // Apply search query input
    if (searchQuery.length > 0) {
        filtered = filtered.filter(note => {
            return (
                note.category.toLowerCase().includes(searchQuery) ||
                note.text.toLowerCase().includes(searchQuery) ||
                note.date.toLowerCase().includes(searchQuery)
            );
        });
    }
    
    // Apply sorting selection
    let notesToRender = [...filtered];
    if (sortOrder === 'oldest') {
        notesToRender.reverse();
    }
    
    renderNotes(notesToRender);
}

// Render filtered note cards
function renderNotes(notes) {
    if (notes.length === 0) {
        feedContainer.innerHTML = `
            <div class="empty-state card-glass fade-in">
                <div class="empty-state-icon"><i class="fa-regular fa-folder-open"></i></div>
                <h3>No updates found</h3>
                <p>No release notes matched your search query or selected type filter. Try resetting your query.</p>
            </div>
        `;
        resultsCountDiv.textContent = 'Showing 0 updates';
        return;
    }
    
    resultsCountDiv.textContent = `Showing ${notes.length} of ${allNotes.length} updates`;
    
    feedContainer.innerHTML = notes.map((note, index) => {
        const catClass = categoryClassMap[note.category.toLowerCase()] || 'change';
        return `
            <article class="release-card card-glass card-${catClass} fade-in" style="animation-delay: ${index * 0.05}s">
                <div class="release-card-header">
                    <div class="badge-wrapper">
                        <span class="category-badge badge-${catClass}">${note.category}</span>
                    </div>
                    <span class="card-date"><i class="fa-regular fa-calendar-days"></i> ${note.date}</span>
                </div>
                <div class="release-card-body">
                    ${note.html}
                </div>
                <div class="release-card-footer">
                    <button class="btn-action action-copy" onclick="copyReleaseNote('${note.id}')" title="Copy text summary">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button class="btn-action action-tweet" onclick="openTweetComposer('${note.id}')" title="Share update on X (Twitter)">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

// Copy release note plain text representation to clipboard
window.copyReleaseNote = function(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;
    
    // Format copy text beautifully
    const copyText = `BigQuery Release Note [${note.category}] (${note.date}):\n\n${note.text}\n\nRead more: ${note.link}`;
    
    navigator.clipboard.writeText(copyText).then(() => {
        // Toggle card action button state
        const card = document.querySelector(`[onclick="copyReleaseNote('${noteId}')"]`);
        if (card) {
            const icon = card.querySelector('i');
            card.classList.add('copied');
            icon.className = 'fa-solid fa-check';
            
            setTimeout(() => {
                card.classList.remove('copied');
                icon.className = 'fa-regular fa-copy';
            }, 2000);
        }
        
        showToast("Copied release note to clipboard!");
    }).catch(err => {
        console.error("Clipboard copy failed:", err);
        showToast("Failed to copy. Please copy manually.");
    });
};

// Open Twitter Composer dialog popup
window.openTweetComposer = function(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;
    
    currentNoteForTweet = note;
    
    // Generate intelligent default tweet text
    // E.g.: "New BigQuery [Category] ([Date]): [Snippet of text...] Read more: [Link]"
    const header = `BigQuery ${note.category} (${note.date}):\n`;
    const footer = `\n\nRead details: ${note.link}`;
    const hashtags = ` #BigQuery #GoogleCloud`;
    
    // Max description length = 280 - header length - footer length - hashtags length - padding
    const maxDescLen = 280 - header.length - footer.length - hashtags.length - 10;
    
    let trimmedDesc = note.text;
    if (trimmedDesc.length > maxDescLen) {
        trimmedDesc = trimmedDesc.substring(0, maxDescLen - 3) + "...";
    }
    
    const defaultTweet = `${header}${trimmedDesc}${hashtags}${footer}`;
    
    tweetTextarea.value = defaultTweet;
    
    // Set up default modal states
    previewLinkTitle.textContent = `BigQuery Release - ${note.date}`;
    updateTweetComposerStatus();
    
    // Show modal
    tweetModal.classList.add('active');
    tweetModal.setAttribute('aria-hidden', 'false');
    tweetTextarea.focus();
    // Position cursor at the end
    tweetTextarea.setSelectionRange(tweetTextarea.value.length, tweetTextarea.value.length);
};

// Close Twitter Composer modal
function closeTweetModal() {
    tweetModal.classList.remove('active');
    tweetModal.setAttribute('aria-hidden', 'true');
    currentNoteForTweet = null;
}

// Update counter, progress ring stroke, live card preview while typing
function updateTweetComposerStatus() {
    const text = tweetTextarea.value;
    const len = text.length;
    
    // Counter text
    charCountSpan.textContent = `${len} / 280`;
    
    // Sync text to Twitter live preview card
    // Convert newlines to breaks for HTML, preserve spacing
    tweetPreviewText.innerHTML = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, '<br>')
        // Simple regex highlight for links and hashtags
        .replace(/(https?:\/\/[^\s]+)/g, '<span style="color: #1d9bf0;">$1</span>')
        .replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color: #1d9bf0;">$1</span>');

    // Handle circular indicator percentage fill
    const percent = Math.min((len / 280) * 100, 100);
    const offset = circleCircumference - (percent / 100 * circleCircumference);
    progressIndicator.style.strokeDashoffset = offset;
    
    // Warn color transitions close to limits
    if (len >= 280) {
        progressIndicator.style.stroke = '#EF4444'; // Red
        charCountSpan.style.color = '#EF4444';
        publishTweetBtn.disabled = true;
    } else if (len >= 260) {
        progressIndicator.style.stroke = '#F59E0B'; // Yellow/Orange
        charCountSpan.style.color = '#F59E0B';
        publishTweetBtn.disabled = false;
    } else {
        progressIndicator.style.stroke = '#4285F4'; // Blue
        charCountSpan.style.color = 'var(--text-muted)';
        publishTweetBtn.disabled = false;
    }
    
    // Handle empty tweet text block
    if (len === 0) {
        publishTweetBtn.disabled = true;
    }
}

// Redirect tweet composition to X Web Intent API in a new tab
function submitTweet() {
    const text = tweetTextarea.value;
    if (text.length === 0 || text.length > 280) return;
    
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
    
    closeTweetModal();
    showToast("Opening X (Twitter) share page...");
}

// Show micro notification popup toast
function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('active');
    
    // Auto remove toast
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3500);
}

// Generate Skeleton Cards HTML markup structure
function getSkeletonHTML(count) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += `
            <div class="skeleton-card card-glass">
                <div class="skeleton-header">
                    <div class="skeleton-badge"></div>
                    <div class="skeleton-date"></div>
                </div>
                <div class="skeleton-title"></div>
                <div class="skeleton-body">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
                <div class="skeleton-footer"></div>
            </div>
        `;
    }
    return skeletons;
}

// Export filtered release notes to CSV file
function exportToCSV() {
    let filtered = allNotes;
    
    // Apply type filter
    if (activeFilter !== 'all') {
        filtered = filtered.filter(note => note.category.toLowerCase() === activeFilter);
    }
    
    // Apply search keyword filter
    if (searchQuery.length > 0) {
        filtered = filtered.filter(note => {
            return (
                note.category.toLowerCase().includes(searchQuery) ||
                note.text.toLowerCase().includes(searchQuery) ||
                note.date.toLowerCase().includes(searchQuery)
            );
        });
    }

    if (filtered.length === 0) {
        showToast("No release notes found to export.");
        return;
    }

    // Sort matching screen selection
    if (sortOrder === 'oldest') {
        filtered = [...filtered].reverse();
    }

    // Build CSV content
    const headers = ["Date", "Category", "Description", "Link"];
    const csvRows = [
        headers.join(","),
        ...filtered.map(note => {
            const date = note.date;
            const category = note.category;
            // Escape double quotes in text
            const desc = note.text.replace(/"/g, '""');
            const link = note.link;
            return `"${date}","${category}","${desc}","${link}"`;
        })
    ];
    
    const csvContent = csvRows.join("\n");
    
    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const timestamp = new Date().toISOString().slice(0, 10);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast(`Successfully exported ${filtered.length} entries to CSV!`);
    } catch (err) {
        console.error("CSV export failed:", err);
        showToast("Failed to export CSV. Please try again.");
    }
}
