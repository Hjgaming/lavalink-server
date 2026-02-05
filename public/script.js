// Configuration
const REFRESH_INTERVAL = 5000; // 5 seconds
const API_ENDPOINTS = {
    stats: '/stats',
    info: '/info',
    version: '/version'
};

// State
let isOnline = false;
let lastUpdate = null;

// Utility Functions
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
    if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);
    
    return parts.join(' ') || '0s';
}

function formatPercentage(value, decimals = 2) {
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

function showError(message) {
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

function updateStatusBadge(online) {
    const badge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    
    if (badge && statusText) {
        if (online) {
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

// API Functions
async function fetchJSON(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error;
    }
}

async function updateStats() {
    try {
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
        
        // Player statistics
        const players = data.players || 0;
        const playingPlayers = data.playingPlayers || 0;
        
        updateElement('players-active', formatNumber(players));
        updateElement('players-playing', formatNumber(playingPlayers));
        updateElement('players-guilds', formatNumber(players)); // Assuming one player per guild
        
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
        
    } catch (error) {
        console.error('Error updating stats:', error);
        throw error;
    }
}

async function updateInfo() {
    try {
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
        const jvm = data.jvm || 'Unknown';
        updateElement('jvm-version', jvm);
        
        // System info (if available)
        if (data.systemLoad !== undefined) {
            updateElement('cpu-system', formatPercentage(data.systemLoad));
        }
        
    } catch (error) {
        console.error('Error updating info:', error);
        throw error;
    }
}

async function updateVersion() {
    try {
        const data = await fetchJSON(API_ENDPOINTS.version);
        
        // Update version in header
        updateElement('version', `v${data.semver || data.version || 'Unknown'}`);
        
        // Update build time
        if (data.build) {
            updateElement('build-time', formatTimestamp(data.build));
        }
        
    } catch (error) {
        console.error('Error updating version:', error);
        throw error;
    }
}

async function updateSystemDetails() {
    try {
        const data = await fetchJSON(API_ENDPOINTS.info);
        
        // OS info
        const os = data.os || {};
        updateElement('os-name', `${os.name || 'Unknown'} ${os.version || ''}`.trim());
        
        // Thread info (if available in stats)
        const statsData = await fetchJSON(API_ENDPOINTS.stats);
        if (statsData.threads) {
            updateElement('threads-running', formatNumber(statsData.threads.running || 0));
            updateElement('threads-daemon', formatNumber(statsData.threads.daemon || 0));
            updateElement('threads-peak', formatNumber(statsData.threads.peak || 0));
        }
        
    } catch (error) {
        console.error('Error updating system details:', error);
        // Don't throw - this is optional data
    }
}

async function updateDashboard() {
    try {
        // Fetch all data
        await Promise.all([
            updateStats(),
            updateInfo(),
            updateVersion(),
            updateSystemDetails()
        ]);
        
        // Update status
        isOnline = true;
        updateStatusBadge(true);
        hideError();
        
        // Update last update time
        lastUpdate = new Date();
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Dashboard update failed:', error);
        isOnline = false;
        updateStatusBadge(false);
        showError(`Failed to fetch data: ${error.message}`);
    }
}

// Initialize
function init() {
    console.log('Initializing Lavalink Dashboard...');
    
    // Initial update
    updateDashboard();
    
    // Set up auto-refresh
    setInterval(updateDashboard, REFRESH_INTERVAL);
    
    // Update "last update" time every second
    setInterval(updateLastUpdateTime, 1000);
    
    console.log(`Dashboard initialized. Auto-refresh every ${REFRESH_INTERVAL / 1000}s`);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
