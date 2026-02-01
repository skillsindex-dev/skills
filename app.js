// SkillsIndex - Interactive Dashboard

const DATA_URL = 'https://raw.githubusercontent.com/skillsindex-dev/data/main/latest/skills.json';
const STATS_URL = 'https://raw.githubusercontent.com/skillsindex-dev/data/main/latest/stats.json';

let allData = [];
let filteredData = [];
let currentPage = 0;
const ITEMS_PER_PAGE = 24;

// Colors for charts
const COLORS = {
    skill: '#22c55e',
    mcp: '#3b82f6',
    a2a: '#f59e0b',
    github: '#6366f1',
    smithery: '#8b5cf6',
    categories: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1']
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadData();
    setupTabs();
    setupFilters();
});

// Load stats.json for dashboard
async function loadStats() {
    try {
        const response = await fetch(STATS_URL);
        const stats = await response.json();
        renderDashboard(stats);
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Load full data for search/explore
async function loadData() {
    try {
        const response = await fetch(DATA_URL);
        allData = await response.json();
        filteredData = [...allData];

        // Update hero stats with exact numbers
        document.getElementById('stat-skills').textContent = formatNumber(allData.filter(i => i.type === 'skill').length);
        document.getElementById('stat-mcp').textContent = formatNumber(allData.filter(i => i.type === 'mcp').length);
        document.getElementById('stat-a2a').textContent = formatNumber(allData.filter(i => i.type === 'a2a').length);
        document.getElementById('total-count').textContent = formatNumber(allData.length) + '+';

        // Populate category filter
        const categories = [...new Set(allData.map(i => i.category))].sort();
        const categorySelect = document.getElementById('filter-category');
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });

        renderResults();
    } catch (error) {
        console.error('Failed to load data:', error);
        document.getElementById('results-grid').innerHTML = '<div class="loading">Failed to load data. Please try again.</div>';
    }
}

// Render dashboard
function renderDashboard(stats) {
    // Update last update time
    const lastUpdate = new Date(stats.scraped_at);
    document.getElementById('last-update').textContent = lastUpdate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Type chart
    renderDonutChart('type-chart', 'type-legend', stats.by_type, {
        skill: COLORS.skill,
        mcp: COLORS.mcp,
        a2a: COLORS.a2a
    });

    // Source chart
    renderDonutChart('source-chart', 'source-legend', stats.by_source, {
        github: COLORS.github,
        smithery: COLORS.smithery
    });

    // Category bar chart
    renderBarChart('category-chart', stats.by_category);

    // Quality metrics
    renderQualityMetrics('quality-metrics', stats.quality, stats.total_items);

    // Stars stats
    renderStarsStats('stars-stats', stats.stars_stats);

    // Top lists
    renderTopItems('top-items-list', stats.top_items);
    renderTopRepos('top-repos-list', stats.top_repos);
    renderTopAuthors('top-authors-list', stats.top_authors);
}

// Donut chart with CSS
function renderDonutChart(chartId, legendId, data, colors) {
    const chart = document.getElementById(chartId);
    const legend = document.getElementById(legendId);

    const total = Object.values(data).reduce((a, b) => a + b, 0);
    let cumulative = 0;
    let gradientParts = [];

    Object.entries(data).forEach(([key, value]) => {
        const percentage = (value / total) * 100;
        const start = cumulative;
        cumulative += percentage;
        gradientParts.push(`${colors[key]} ${start}% ${cumulative}%`);
    });

    chart.style.background = `conic-gradient(${gradientParts.join(', ')})`;
    chart.innerHTML = `<div style="position:absolute;inset:20px;background:var(--bg-card);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;">
        <div style="font-size:1.5rem;font-weight:700;">${formatNumber(total)}</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">total</div>
    </div>`;
    chart.style.position = 'relative';

    legend.innerHTML = Object.entries(data).map(([key, value]) => `
        <div class="legend-item">
            <div class="legend-color" style="background:${colors[key]}"></div>
            <span>${key}</span>
            <span class="legend-value">${formatNumber(value)}</span>
        </div>
    `).join('');
}

// Bar chart
function renderBarChart(containerId, data) {
    const container = document.getElementById(containerId);
    const max = Math.max(...Object.values(data));

    container.innerHTML = Object.entries(data).slice(0, 10).map(([key, value], i) => `
        <div class="bar-item">
            <div class="bar-label">${key}</div>
            <div class="bar-track">
                <div class="bar-fill" style="width:${(value / max) * 100}%;background:${COLORS.categories[i % COLORS.categories.length]}"></div>
            </div>
            <div class="bar-value">${formatNumber(value)}</div>
        </div>
    `).join('');
}

// Quality metrics
function renderQualityMetrics(containerId, quality, total) {
    const container = document.getElementById(containerId);

    const metrics = [
        { label: 'With description', value: quality.with_description, color: '#22c55e' },
        { label: 'With tags', value: quality.with_tags, color: '#3b82f6' },
        { label: 'With repository', value: quality.with_repo, color: '#8b5cf6' },
        { label: 'Verified', value: quality.verified, color: '#f59e0b' }
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
                    <div class="quality-fill" style="width:${pct}%;background:${m.color}"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Stars stats
function renderStarsStats(containerId, stats) {
    const container = document.getElementById(containerId);

    container.innerHTML = `
        <div class="stats-item">
            <span class="stats-item-label">Max stars</span>
            <span class="stats-item-value">${formatNumber(stats.max)}</span>
        </div>
        <div class="stats-item">
            <span class="stats-item-label">Average</span>
            <span class="stats-item-value">${formatNumber(Math.round(stats.avg))}</span>
        </div>
        <div class="stats-item">
            <span class="stats-item-label">With stars</span>
            <span class="stats-item-value">${formatNumber(stats.with_stars)}</span>
        </div>
        <div class="stats-item">
            <span class="stats-item-label">Zero stars</span>
            <span class="stats-item-value">${formatNumber(stats.zero_stars)}</span>
        </div>
    `;
}

// Top items list
function renderTopItems(containerId, items) {
    const container = document.getElementById(containerId);

    container.innerHTML = items.slice(0, 20).map((item, i) => `
        <div class="top-item">
            <div class="top-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
            <div class="top-info">
                <div class="top-name">${escapeHtml(item.name)}</div>
                <div class="top-meta">
                    <span class="top-type ${item.type}">${item.type}</span>
                    <span>via ${item.source}</span>
                </div>
            </div>
            <div class="top-stars">
                <span>⭐</span>
                <span>${formatNumber(item.stars)}</span>
            </div>
        </div>
    `).join('');
}

// Top repos list
function renderTopRepos(containerId, repos) {
    const container = document.getElementById(containerId);

    container.innerHTML = Object.entries(repos).slice(0, 15).map(([repo, count], i) => `
        <div class="top-item">
            <div class="top-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
            <div class="top-info">
                <a href="https://github.com/${repo}" target="_blank" class="top-name">${repo}</a>
            </div>
            <div class="top-stars">
                <span>${formatNumber(count)} items</span>
            </div>
        </div>
    `).join('');
}

// Top authors list
function renderTopAuthors(containerId, authors) {
    const container = document.getElementById(containerId);

    container.innerHTML = Object.entries(authors).slice(0, 15).map(([author, count], i) => `
        <div class="top-item">
            <div class="top-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
            <div class="top-info">
                <div class="top-name">${author}</div>
            </div>
            <div class="top-stars">
                <span>${formatNumber(count)} items</span>
            </div>
        </div>
    `).join('');
}

// Setup tabs
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
}

// Setup filters
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const typeFilter = document.getElementById('filter-type');
    const categoryFilter = document.getElementById('filter-category');
    const sourceFilter = document.getElementById('filter-source');
    const sortFilter = document.getElementById('filter-sort');
    const loadMoreBtn = document.getElementById('load-more');

    let debounceTimer;

    const applyFilters = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const search = searchInput.value.toLowerCase();
            const type = typeFilter.value;
            const category = categoryFilter.value;
            const source = sourceFilter.value;
            const sort = sortFilter.value;

            filteredData = allData.filter(item => {
                if (type && item.type !== type) return false;
                if (category && item.category !== category) return false;
                if (source && item.source !== source) return false;
                if (search) {
                    const searchText = `${item.name} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
                    if (!searchText.includes(search)) return false;
                }
                return true;
            });

            // Sort
            if (sort === 'stars') {
                filteredData.sort((a, b) => (b.stars || 0) - (a.stars || 0));
            } else if (sort === 'name') {
                filteredData.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sort === 'recent') {
                filteredData.sort((a, b) => new Date(b.scraped_at || 0) - new Date(a.scraped_at || 0));
            }

            currentPage = 0;
            renderResults();
        }, 200);
    };

    searchInput.addEventListener('input', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
    sourceFilter.addEventListener('change', applyFilters);
    sortFilter.addEventListener('change', applyFilters);

    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        renderResults(true);
    });
}

// Render search results
function renderResults(append = false) {
    const container = document.getElementById('results-grid');
    const countEl = document.getElementById('results-count');
    const loadMoreBtn = document.getElementById('load-more');

    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = filteredData.slice(start, end);

    countEl.textContent = formatNumber(filteredData.length);

    const html = pageItems.map(item => `
        <a href="${item.raw_url || item.repo_url || '#'}" target="_blank" class="result-card">
            <div class="result-header">
                <div class="result-name">${escapeHtml(item.name)}</div>
                ${item.stars > 0 ? `<div class="result-stars">⭐ ${formatNumber(item.stars)}</div>` : ''}
            </div>
            <div class="result-description">${escapeHtml(item.description || 'No description available')}</div>
            <div class="result-footer">
                <div class="result-tags">
                    <span class="result-tag">${item.category}</span>
                    ${item.source ? `<span class="result-tag">${item.source}</span>` : ''}
                </div>
                <span class="result-type ${item.type}">${item.type}</span>
            </div>
        </a>
    `).join('');

    if (append) {
        container.innerHTML += html;
    } else {
        container.innerHTML = html || '<div class="loading">No items found matching your criteria.</div>';
    }

    // Show/hide load more button
    if (end >= filteredData.length) {
        loadMoreBtn.classList.add('hidden');
    } else {
        loadMoreBtn.classList.remove('hidden');
    }
}

// Utilities
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
