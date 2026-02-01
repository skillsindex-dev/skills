// SkillsIndex — Clean Dashboard

// Data URLs - relative paths for GitHub Pages (from /catalog/)
const DATA_URL = '../skills.json';
const STATS_URL = '../stats.json';

let allData = [];
let filteredData = [];
let currentPage = 0;
const PAGE_SIZE = 24;

// Colors
const COLORS = {
    skill: '#22c55e',
    mcp: '#3b82f6',
    a2a: '#f59e0b',
    github: '#71717a',
    smithery: '#d4a574'
};

// Favorites storage key
const FAVORITES_KEY = 'skillsindex_favorites';

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupKeyboardShortcuts();
    setupCodeTabs();
    await Promise.all([loadStats(), loadData()]);
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            document.getElementById('search-input').focus();
        }
        // Escape to clear search
        if (e.key === 'Escape' && document.activeElement.tagName === 'INPUT') {
            document.activeElement.blur();
        }
    });
}

// Code tabs
function setupCodeTabs() {
    document.querySelectorAll('.code-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.code-block').forEach(b => b.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById(`code-${tab.dataset.lang}`).classList.remove('hidden');
        });
    });
}

// Load stats
async function loadStats() {
    try {
        const res = await fetch(STATS_URL);
        const stats = await res.json();
        renderStats(stats);
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

// Load data
async function loadData() {
    try {
        const res = await fetch(DATA_URL);
        allData = await res.json();
        filteredData = [...allData];

        // Update counts
        const skills = allData.filter(i => i.type === 'skill').length;
        const mcp = allData.filter(i => i.type === 'mcp').length;
        const a2a = allData.filter(i => i.type === 'a2a').length;

        document.getElementById('hero-count').textContent = formatNum(allData.length);
        document.getElementById('stat-skills').textContent = formatNum(skills);
        document.getElementById('stat-mcp').textContent = formatNum(mcp);
        document.getElementById('stat-a2a').textContent = formatNum(a2a);

        // Populate categories
        const categories = [...new Set(allData.map(i => i.category))].sort();
        const catSelect = document.getElementById('filter-category');
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            catSelect.appendChild(opt);
        });

        setupFilters();
        renderResults();
    } catch (e) {
        console.error('Failed to load data:', e);
        document.getElementById('results-grid').innerHTML =
            '<div class="loading-state"><span>Failed to load data</span></div>';
    }
}

// Render stats
function renderStats(stats) {
    // Last update
    const date = new Date(stats.scraped_at);
    document.getElementById('last-update').textContent = date.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });

    // Type chart
    renderDonut('chart-type', stats.by_type, {
        skill: COLORS.skill,
        mcp: COLORS.mcp,
        a2a: COLORS.a2a
    });

    // Source chart
    renderDonut('chart-source', stats.by_source, {
        github: COLORS.github,
        smithery: COLORS.smithery
    });

    // Categories
    renderBars('chart-categories', stats.by_category);

    // Top items
    renderTopItems('top-items', stats.top_items);

    // Quality
    renderQuality('quality-metrics', stats.quality, stats.total_items);

    // Contributors
    renderContributors('top-authors', stats.top_authors);
}

// Donut chart
function renderDonut(id, data, colors) {
    const container = document.getElementById(id);
    const total = Object.values(data).reduce((a, b) => a + b, 0);

    let gradient = [];
    let cumulative = 0;

    Object.entries(data).forEach(([key, val]) => {
        const pct = (val / total) * 100;
        gradient.push(`${colors[key]} ${cumulative}% ${cumulative + pct}%`);
        cumulative += pct;
    });

    const legend = Object.entries(data).map(([key, val]) => `
        <div class="legend-item">
            <div class="legend-dot" style="background:${colors[key]}"></div>
            <span class="legend-name">${key}</span>
            <span class="legend-value">${formatNum(val)}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="donut" style="background: conic-gradient(${gradient.join(', ')})">
            <div class="donut-center">
                <span class="donut-value">${formatNum(total)}</span>
                <span class="donut-label">total</span>
            </div>
        </div>
        <div class="legend">${legend}</div>
    `;
}

// Bar chart
function renderBars(id, data) {
    const container = document.getElementById(id);
    const entries = Object.entries(data).slice(0, 8);
    const max = Math.max(...entries.map(([, v]) => v));

    container.innerHTML = entries.map(([key, val]) => `
        <div class="bar-row">
            <span class="bar-label">${key}</span>
            <div class="bar-track">
                <div class="bar-fill" style="width: ${(val / max) * 100}%"></div>
            </div>
            <span class="bar-value">${formatNum(val)}</span>
        </div>
    `).join('');
}

// Top items
function renderTopItems(id, items) {
    const container = document.getElementById(id);
    container.innerHTML = items.slice(0, 8).map((item, i) => `
        <div class="top-item">
            <span class="top-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
            <span class="top-name">${esc(item.name)}</span>
            <span class="top-type-badge ${item.type}">${item.type}</span>
            <span class="top-stars">${formatNum(item.stars)}</span>
        </div>
    `).join('');
}

// Quality metrics
function renderQuality(id, quality, total) {
    const container = document.getElementById(id);
    const metrics = [
        { label: 'With description', value: quality.with_description },
        { label: 'With tags', value: quality.with_tags },
        { label: 'With repository', value: quality.with_repo },
        { label: 'Verified', value: quality.verified }
    ];

    container.innerHTML = metrics.map(m => {
        const pct = ((m.value / total) * 100).toFixed(1);
        return `
            <div class="quality-item">
                <div class="quality-header">
                    <span class="quality-label">${m.label}</span>
                    <span class="quality-value">${pct}%</span>
                </div>
                <div class="quality-bar">
                    <div class="quality-fill" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Contributors
function renderContributors(id, authors) {
    const container = document.getElementById(id);
    container.innerHTML = Object.entries(authors).slice(0, 6).map(([name, count]) => `
        <div class="contributor-item">
            <span class="contributor-name">${name}</span>
            <span class="contributor-count">${formatNum(count)}</span>
        </div>
    `).join('');
}

// Setup filters
function setupFilters() {
    const search = document.getElementById('search-input');
    const type = document.getElementById('filter-type');
    const category = document.getElementById('filter-category');
    const sort = document.getElementById('filter-sort');
    const loadMore = document.getElementById('load-more');

    let debounce;
    const apply = () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            const q = search.value.toLowerCase();
            const t = type.value;
            const c = category.value;
            const s = sort.value;

            // Handle special filter for favorites
            if (t === 'favorites') {
                const favs = getFavorites();
                filteredData = allData.filter(item => favs.includes(item.id));
            } else {
                filteredData = allData.filter(item => {
                    if (t && item.type !== t) return false;
                    if (c && item.category !== c) return false;
                    if (q) {
                        const text = `${item.name} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
                        if (!text.includes(q)) return false;
                    }
                    return true;
                });
            }

            // Sort
            if (s === 'stars') filteredData.sort((a, b) => (b.stars || 0) - (a.stars || 0));
            else if (s === 'name') filteredData.sort((a, b) => a.name.localeCompare(b.name));
            else if (s === 'recent') filteredData.sort((a, b) => new Date(b.scraped_at || 0) - new Date(a.scraped_at || 0));

            currentPage = 0;
            renderResults();
        }, 150);
    };

    search.addEventListener('input', apply);
    type.addEventListener('change', apply);
    category.addEventListener('change', apply);
    sort.addEventListener('change', apply);
    loadMore.addEventListener('click', () => { currentPage++; renderResults(true); });

    // Check URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('type')) {
        type.value = params.get('type');
        apply();
    }
    if (params.get('q')) {
        search.value = params.get('q');
        apply();
    }
}

// Check if item is new (within last 7 days)
function isNewItem(item) {
    if (!item.scraped_at) return false;
    const scraped = new Date(item.scraped_at);
    const now = new Date();
    const diffDays = (now - scraped) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
}

// Render results
function renderResults(append = false) {
    const container = document.getElementById('results-grid');
    const countEl = document.getElementById('results-count');
    const loadMore = document.getElementById('load-more');

    const start = currentPage * PAGE_SIZE;
    const items = filteredData.slice(start, start + PAGE_SIZE);
    const favorites = getFavorites();

    countEl.textContent = formatNum(filteredData.length);

    const html = items.map(item => {
        const isFav = favorites.includes(item.id);
        const isNew = isNewItem(item);
        const detailUrl = `../item/${item.id}/`;

        return `
        <div class="item-card" data-id="${item.id}">
            <div class="item-header">
                <a href="${detailUrl}" class="item-name-link">
                    <span class="item-name">${esc(item.name)}</span>
                </a>
                <div class="item-actions">
                    ${item.stars > 0 ? `<span class="item-stars">★ ${formatNum(item.stars)}</span>` : ''}
                    <button class="item-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${item.id}', event)" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <a href="${detailUrl}" class="item-body">
                ${isNew ? '<span class="item-badge new">New</span>' : ''}
                ${item.verified ? '<span class="item-badge verified">Verified</span>' : ''}
                <p class="item-description">${esc(item.description || 'No description')}</p>
            </a>
            <div class="item-footer">
                <span class="item-category">${item.category}</span>
                <span class="item-type ${item.type}">${item.type}</span>
            </div>
        </div>
    `}).join('');

    if (append) {
        container.innerHTML += html;
    } else {
        container.innerHTML = html || '<div class="loading-state"><span>No items found</span></div>';
    }

    loadMore.classList.toggle('hidden', start + PAGE_SIZE >= filteredData.length);
}

// Favorites functions
function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    } catch {
        return [];
    }
}

function toggleFavorite(id, event) {
    event.preventDefault();
    event.stopPropagation();

    const favs = getFavorites();
    const idx = favs.indexOf(id);

    if (idx === -1) {
        favs.push(id);
    } else {
        favs.splice(idx, 1);
    }

    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));

    // Update button state
    const btn = event.currentTarget;
    const svg = btn.querySelector('svg');
    const isNowFav = idx === -1;

    btn.classList.toggle('active', isNowFav);
    svg.setAttribute('fill', isNowFav ? 'currentColor' : 'none');
    btn.title = isNowFav ? 'Remove from favorites' : 'Add to favorites';

    // Update favorites count in filter if visible
    updateFavoritesCount();
}

function updateFavoritesCount() {
    const favs = getFavorites();
    const option = document.querySelector('#filter-type option[value="favorites"]');
    if (option) {
        option.textContent = `Favorites (${favs.length})`;
    }
}

// Utilities
function formatNum(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
}

function esc(str) {
    if (!str) return '';
    const el = document.createElement('div');
    el.textContent = str;
    return el.innerHTML;
}
