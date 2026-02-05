// =====================================================
// Lavalink Dashboard - Advanced Version
// =====================================================

// Configuration
const DEFAULT_REFRESH_INTERVAL = 5000;
const INITIAL_RETRY_DELAY = 2000;
const MAX_RETRIES = 5;
const CHART_MAX_POINTS = 30;
const MAX_LOG_ENTRIES = 50;

const API_ENDPOINTS = {
    stats: '/v4/stats',
    info: '/v4/info',
    version: '/version'
};

// State
let isOnline = false;
let lastUpdate = null;
let retryCount = 0;
let isInitializing = true;
let refreshInterval = DEFAULT_REFRESH_INTERVAL;
let isAutoRefresh = true;
let refreshTimer = null;

// Chart instances
let cpuChart = null;
let memoryChart = null;

// Chart data history
const chartData = {
    labels: [],
    cpuProcess: [],
    cpuSystem: [],
    memoryUsed: [],
    memoryAllocated: []
};

// =====================================================
// Utility Functions
// =====================================================

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
}

function formatUptime(milliseconds) {
    if (!milliseconds) return 'N/A';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (parts.length === 0 || seconds % 60 > 0) parts.push(`${seconds % 60}s`);
    
    return parts.join(' ') || '0s';
}

function formatUptimeShort(milliseconds) {
    if (!milliseconds) return '0s';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

function formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(decimals)}%`;
}

function formatNumber(num) {
    if (!num && num !== 0) return 'N/A';
    return num.toLocaleString();
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour12: false });
}

function getProgressBarClass(percentage) {
    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return '';
}

function updateProgressBar(elementId, percentage) {
    const element = document.getElementById(elementId);
    if (element) {
        const percent = Math.min(Math.max(percentage, 0), 100);
        element.style.width = `${percent}%`;
        element.className = `progress-fill ${getProgressBarClass(percent)}`;
    }
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// =====================================================
// Logging Functions
// =====================================================

function addLog(message, type = 'info') {
    const logContainer = document.getElementById('log-container');
    if (!logContainer) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = formatTime(new Date());
    
    const msg = document.createElement('span');
    msg.className = 'log-message';
    msg.textContent = message;
    
    entry.appendChild(time);
    entry.appendChild(msg);
    logContainer.appendChild(entry);
    
    // Keep only last N entries
    while (logContainer.children.length > MAX_LOG_ENTRIES) {
        logContainer.removeChild(logContainer.firstChild);
    }
    
    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
}

function clearLog() {
    const logContainer = document.getElementById('log-container');
    if (logContainer) {
        logContainer.innerHTML = '';
        addLog('Log cleared', 'info');
    }
}

// =====================================================
// Error & Status Functions
// =====================================================

function showError(message, isWarning = false) {
    const errorElement = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    if (errorElement && errorText) {
        errorText.textContent = message;
        errorElement.style.display = 'flex';
    }
}

function hideError() {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function updateStatusBadge(online, connecting = false) {
    const badge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    
    if (badge && statusText) {
        if (connecting) {
            badge.classList.remove('online');
            badge.classList.add('offline');
            statusText.textContent = 'Connecting...';
        } else if (online) {
            badge.classList.add('online');
            badge.classList.remove('offline');
            statusText.textContent = 'Online';
        } else {
            badge.classList.add('offline');
            badge.classList.remove('online');
            statusText.textContent = 'Offline';
        }
    }
}

function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement && lastUpdate) {
        const now = new Date();
        const diff = Math.floor((now - lastUpdate) / 1000);
        
        if (diff < 60) {
            lastUpdateElement.textContent = `${diff}s ago`;
        } else if (diff < 3600) {
            lastUpdateElement.textContent = `${Math.floor(diff / 60)}m ago`;
        } else {
            lastUpdateElement.textContent = lastUpdate.toLocaleTimeString();
        }
    }
}

// =====================================================
// Chart Functions
// =====================================================

function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 500
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
                    padding: 15,
                    usePointStyle: true
                }
            }
        },
        scales: {
            x: {
                display: true,
                grid: {
                    color: 'rgba(48, 54, 61, 0.3)'
                },
                ticks: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
                    maxTicksLimit: 6
                }
            },
            y: {
                display: true,
                min: 0,
                max: 100,
                grid: {
                    color: 'rgba(48, 54, 61, 0.3)'
                },
                ticks: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
                    callback: (value) => `${value}%`
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };

    // CPU Chart
    const cpuCtx = document.getElementById('cpu-chart');
    if (cpuCtx) {
        cpuChart = new Chart(cpuCtx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Process',
                        data: chartData.cpuProcess,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.2)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2
                    },
                    {
                        label: 'System',
                        data: chartData.cpuSystem,
                        borderColor: '#764ba2',
                        backgroundColor: 'rgba(118, 75, 162, 0.2)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2
                    }
                ]
            },
            options: chartOptions
        });
    }

    // Memory Chart
    const memoryCtx = document.getElementById('memory-chart');
    if (memoryCtx) {
        const memoryOptions = { ...chartOptions };
        memoryOptions.scales = {
            ...memoryOptions.scales,
            y: {
                ...memoryOptions.scales.y,
                max: undefined,
                ticks: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
                    callback: (value) => `${value} MB`
                }
            }
        };
        
        memoryChart = new Chart(memoryCtx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Used',
                        data: chartData.memoryUsed,
                        borderColor: '#43e97b',
                        backgroundColor: 'rgba(67, 233, 123, 0.2)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2
                    },
                    {
                        label: 'Allocated',
                        data: chartData.memoryAllocated,
                        borderColor: '#38f9d7',
                        backgroundColor: 'rgba(56, 249, 215, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2
                    }
                ]
            },
            options: memoryOptions
        });
    }
}

function updateChartData(stats) {
    const now = formatTime(new Date());
    
    // Add new data point
    chartData.labels.push(now);
    chartData.cpuProcess.push((stats.cpu?.lavalinkLoad || 0) * 100);
    chartData.cpuSystem.push((stats.cpu?.systemLoad || 0) * 100);
    chartData.memoryUsed.push(Math.round((stats.memory?.used || 0) / (1024 * 1024)));
    chartData.memoryAllocated.push(Math.round((stats.memory?.allocated || 0) / (1024 * 1024)));
    
    // Keep only last N points
    if (chartData.labels.length > CHART_MAX_POINTS) {
        chartData.labels.shift();
        chartData.cpuProcess.shift();
        chartData.cpuSystem.shift();
        chartData.memoryUsed.shift();
        chartData.memoryAllocated.shift();
    }
    
    // Update charts
    if (cpuChart) {
        cpuChart.update('none');
    }
    if (memoryChart) {
        memoryChart.update('none');
    }
}

// =====================================================
// API Functions
// =====================================================

async function fetchJSON(endpoint) {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    const trimmedText = text.trim();
    
    if (!trimmedText) {
        throw new Error('Empty response from ' + endpoint);
    }
    
    if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
        throw new Error('Non-JSON response from ' + endpoint);
    }
    
    return JSON.parse(trimmedText);
}

async function fetchText(endpoint) {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return (await response.text()).trim();
}

async function updateStats() {
    const data = await fetchJSON(API_ENDPOINTS.stats);
    
    // Memory metrics
    const memoryUsed = data.memory?.used || 0;
    const memoryAllocated = data.memory?.allocated || 0;
    const memoryFree = data.memory?.free || 0;
    const memoryReservable = data.memory?.reservable || 0;
    
    updateElement('memory-used', `${formatBytes(memoryUsed)} (${formatPercentage(memoryUsed / memoryAllocated)})`);
    updateElement('memory-allocated', formatBytes(memoryAllocated));
    updateElement('memory-free', formatBytes(memoryFree));
    updateElement('memory-reservable', formatBytes(memoryReservable));
    
    const memoryPercentage = memoryAllocated > 0 ? (memoryUsed / memoryAllocated) * 100 : 0;
    updateProgressBar('memory-progress', memoryPercentage);
    
    // CPU metrics
    const cpuProcess = data.cpu?.lavalinkLoad || 0;
    const cpuSystem = data.cpu?.systemLoad || 0;
    const cpuCores = data.cpu?.cores || 0;
    
    updateElement('cpu-process', formatPercentage(cpuProcess));
    updateElement('cpu-system', formatPercentage(cpuSystem));
    updateElement('cpu-cores', cpuCores);
    
    updateProgressBar('cpu-process-progress', cpuProcess * 100);
    updateProgressBar('cpu-system-progress', cpuSystem * 100);
    
    // Quick stats
    updateElement('quick-cpu', formatPercentage(cpuProcess, 0));
    updateElement('quick-memory', formatPercentage(memoryUsed / memoryAllocated, 0));
    
    // Player statistics
    const players = data.players || 0;
    const playingPlayers = data.playingPlayers || 0;
    
    updateElement('players-active', formatNumber(players));
    updateElement('players-playing', formatNumber(playingPlayers));
    updateElement('players-guilds', formatNumber(players));
    
    updateElement('quick-players', players);
    updateElement('quick-playing', playingPlayers);
    
    // Frame statistics
    const frameStats = data.frameStats || {};
    const sent = frameStats.sent || 0;
    const nulled = frameStats.nulled || 0;
    const deficit = frameStats.deficit || 0;
    
    updateElement('frames-sent', formatNumber(sent));
    updateElement('frames-nulled', formatNumber(nulled));
    updateElement('frames-deficit', formatNumber(deficit));
    
    const totalFrames = sent + nulled + deficit;
    const lossPercentage = totalFrames > 0 ? ((nulled + deficit) / totalFrames) * 100 : 0;
    updateElement('frames-loss', `${lossPercentage.toFixed(2)}%`);
    
    // Uptime
    const uptime = data.uptime || 0;
    updateElement('server-uptime', formatUptime(uptime));
    updateElement('quick-uptime', formatUptimeShort(uptime));
    
    // Update charts
    updateChartData(data);
    
    return data;
}

async function updateInfo() {
    const data = await fetchJSON(API_ENDPOINTS.info);
    
    // Version info
    const version = data.version || {};
    updateElement('server-version', version.semver || 'Unknown');
    
    // Build info
    updateElement('build-time', formatTimestamp(version.build));
    
    // Git info
    const git = data.git || {};
    updateElement('git-branch', git.branch || 'Unknown');
    updateElement('git-commit', git.commit ? git.commit.substring(0, 7) : 'Unknown');
    
    // JVM info
    updateElement('jvm-version', data.jvm || 'Unknown');
    
    // Lavaplayer info
    updateElement('lavaplayer-version', data.lavaplayer || 'Unknown');
    
    // OS info
    const os = data.os || {};
    updateElement('os-name', `${os.name || 'Unknown'} ${os.version || ''}`.trim());
    updateElement('os-arch', os.arch || 'Unknown');
    
    // Update sources
    updateSources(data.sourceManagers || []);
    
    // Update plugins
    updatePlugins(data.plugins || []);
    
    return data;
}

async function updateVersion() {
    const version = await fetchText(API_ENDPOINTS.version);
    const cleanVersion = version.replace(/^"|"$/g, '');
    updateElement('version', cleanVersion.startsWith('v') ? cleanVersion : `v${cleanVersion || 'Unknown'}`);
}

function updateSources(sources) {
    const container = document.getElementById('sources-grid');
    if (!container) return;
    
    const sourceNames = {
        'youtube': '🎬 YouTube',
        'soundcloud': '☁️ SoundCloud',
        'bandcamp': '🎸 Bandcamp',
        'twitch': '📺 Twitch',
        'vimeo': '🎥 Vimeo',
        'http': '🌐 HTTP',
        'local': '📁 Local',
        'spotify': '🎧 Spotify',
        'applemusic': '🍎 Apple Music',
        'deezer': '🎵 Deezer'
    };
    
    if (sources.length === 0) {
        container.innerHTML = '<div class="source-badge disabled">No sources available</div>';
        return;
    }
    
    container.innerHTML = sources.map(source => {
        const name = sourceNames[source.toLowerCase()] || source;
        return `<div class="source-badge enabled">✓ ${name}</div>`;
    }).join('');
}

function updatePlugins(plugins) {
    const container = document.getElementById('plugins-list');
    if (!container) return;
    
    if (plugins.length === 0) {
        container.innerHTML = '<div class="no-plugins">No plugins loaded</div>';
        return;
    }
    
    container.innerHTML = plugins.map(plugin => `
        <div class="plugin-item">
            <span class="plugin-name">${plugin.name || 'Unknown Plugin'}</span>
            <span class="plugin-version">${plugin.version || '?'}</span>
        </div>
    `).join('');
}

// =====================================================
// Dashboard Update
// =====================================================

async function updateDashboard() {
    try {
        // Fetch critical data
        await Promise.all([
            updateStats(),
            updateInfo(),
        ]);
        
        // Try to update version
        try {
            await updateVersion();
        } catch (error) {
            console.warn('Version endpoint failed:', error);
        }
        
        // Update status
        if (!isOnline) {
            addLog('Connected to Lavalink server', 'success');
        }
        
        isOnline = true;
        isInitializing = false;
        retryCount = 0;
        updateStatusBadge(true);
        hideError();
        
        // Update last update time
        lastUpdate = new Date();
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Dashboard update failed:', error);
        
        if (isOnline) {
            addLog(`Connection lost: ${error.message}`, 'error');
        }
        
        isOnline = false;
        
        if (isInitializing && retryCount < MAX_RETRIES) {
            retryCount++;
            updateStatusBadge(false, true);
            showError(`Connecting to Lavalink... (Attempt ${retryCount}/${MAX_RETRIES})`);
        } else if (isInitializing && retryCount >= MAX_RETRIES) {
            isInitializing = false;
            updateStatusBadge(false);
            showError(`Unable to connect after ${MAX_RETRIES} attempts: ${error.message}`);
            addLog(`Failed to connect after ${MAX_RETRIES} attempts`, 'error');
        } else {
            updateStatusBadge(false);
            showError(`Connection lost: ${error.message}`);
        }
    }
}

// =====================================================
// Theme Functions
// =====================================================

function initTheme() {
    const savedTheme = localStorage.getItem('lavalink-theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lavalink-theme', theme);
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
    
    // Update chart colors if charts exist
    updateChartColors();
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    addLog(`Theme changed to ${newTheme} mode`, 'info');
}

function updateChartColors() {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    
    [cpuChart, memoryChart].forEach(chart => {
        if (chart) {
            chart.options.plugins.legend.labels.color = textColor;
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.y.ticks.color = textColor;
            chart.update('none');
        }
    });
}

// =====================================================
// Refresh Control Functions
// =====================================================

function initRefreshControl() {
    const intervalSelect = document.getElementById('refresh-interval');
    const toggleBtn = document.getElementById('toggle-refresh');
    
    if (intervalSelect) {
        intervalSelect.addEventListener('change', (e) => {
            refreshInterval = parseInt(e.target.value, 10);
            restartRefreshTimer();
            updateRefreshStatus();
            addLog(`Refresh interval changed to ${refreshInterval / 1000}s`, 'info');
        });
    }
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isAutoRefresh = !isAutoRefresh;
            updateRefreshIcon();
            updateRefreshStatus();
            
            if (isAutoRefresh) {
                restartRefreshTimer();
                addLog('Auto-refresh enabled', 'info');
            } else {
                stopRefreshTimer();
                addLog('Auto-refresh paused', 'warning');
            }
        });
    }
}

function updateRefreshIcon() {
    const icon = document.getElementById('refresh-icon');
    if (icon) {
        icon.textContent = isAutoRefresh ? '⏸️' : '▶️';
    }
}

function updateRefreshStatus() {
    const status = document.getElementById('footer-refresh-status');
    if (status) {
        if (isAutoRefresh) {
            status.textContent = `Auto-refreshes every ${refreshInterval / 1000} seconds`;
        } else {
            status.textContent = 'Auto-refresh paused';
        }
    }
}

function startRefreshTimer() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    refreshTimer = setInterval(updateDashboard, refreshInterval);
}

function stopRefreshTimer() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

function restartRefreshTimer() {
    stopRefreshTimer();
    if (isAutoRefresh) {
        startRefreshTimer();
    }
}

// =====================================================
// Event Listeners
// =====================================================

function initEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Clear log
    const clearLogBtn = document.getElementById('clear-log');
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', clearLog);
    }
}

// =====================================================
// Initialization
// =====================================================

async function init() {
    console.log('Initializing Lavalink Dashboard...');
    
    // Initialize theme
    initTheme();
    
    // Initialize event listeners
    initEventListeners();
    
    // Initialize refresh control
    initRefreshControl();
    
    // Initialize charts
    initCharts();
    
    // Set status to connecting
    updateStatusBadge(false, true);
    addLog('Connecting to Lavalink server...', 'info');
    
    // Initial update with retry logic
    await retryInitialConnection();
    
    // Set up auto-refresh
    startRefreshTimer();
    
    // Update "last update" time every second
    setInterval(updateLastUpdateTime, 1000);
    
    console.log('Dashboard initialized.');
}

async function retryInitialConnection() {
    for (let i = 0; i < MAX_RETRIES; i++) {
        await updateDashboard();
        
        if (isOnline) {
            console.log('Successfully connected to Lavalink');
            return;
        }
        
        if (i < MAX_RETRIES - 1) {
            console.log(`Retry ${i + 1}/${MAX_RETRIES} failed, waiting...`);
            await new Promise(resolve => setTimeout(resolve, INITIAL_RETRY_DELAY));
        }
    }
    
    console.error('Failed to establish initial connection after all retries');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
