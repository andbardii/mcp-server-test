// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const schemaList = document.querySelector('.schema-list');
const queryInput = document.getElementById('query-input');
const executeQueryBtn = document.getElementById('execute-query');
const resultsHeader = document.getElementById('results-header');
const resultsBody = document.getElementById('results-body');
const analysisType = document.getElementById('analysis-type');
const runAnalysisBtn = document.getElementById('run-analysis');
const analysisResults = document.querySelector('.analysis-results');

// Connection Management
let connectionStatus = {
    connected: false,
    host: '',
    port: '',
    database: '',
    user: ''
};

// Utility Functions
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showError(error.message);
        return null;
    }
}

function showError(message) {
    // Implement error display logic
    console.error('Error:', message);
}

// Schema Management
async function loadSchemas() {
    const data = await fetchAPI('/schemas');
    if (data && data.success) {
        renderSchemas(data.data);
    }
}

function renderSchemas(schemas) {
    schemaList.innerHTML = schemas.map(schema => `
        <div class="schema-item" data-schema="${schema.name}">
            <h4>${schema.name}</h4>
            <div class="tables-list" style="display: none;">
                <!-- Tables will be loaded on click -->
            </div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.schema-item').forEach(item => {
        item.addEventListener('click', async () => {
            const schemaName = item.dataset.schema;
            const tablesList = item.querySelector('.tables-list');
            
            if (tablesList.style.display === 'none') {
                const tables = await fetchAPI(`/schemas/${schemaName}/tables`);
                if (tables && tables.success) {
                    tablesList.innerHTML = tables.data.map(table => `
                        <div class="table-item" data-table="${table.name}">
                            ${table.name}
                        </div>
                    `).join('');
                    tablesList.style.display = 'block';
                }
            } else {
                tablesList.style.display = 'none';
            }
        });
    });
}

// Query Execution
executeQueryBtn.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    if (!query) return;

    const data = await fetchAPI('/query', {
        method: 'POST',
        body: JSON.stringify({ sql: query })
    });

    if (data && data.success) {
        renderQueryResults(data.data);
    }
});

function renderQueryResults(results) {
    // Clear previous results
    resultsHeader.innerHTML = '';
    resultsBody.innerHTML = '';

    // Add headers
    const headerRow = document.createElement('tr');
    results.fields.forEach(field => {
        const th = document.createElement('th');
        th.textContent = field.name;
        headerRow.appendChild(th);
    });
    resultsHeader.appendChild(headerRow);

    // Add data rows
    results.rows.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });
        resultsBody.appendChild(tr);
    });
}

// Analysis Tools
runAnalysisBtn.addEventListener('click', async () => {
    const type = analysisType.value;
    let endpoint = '';
    let body = {};

    switch (type) {
        case 'basic':
            endpoint = '/prompts/basicTableSummary/generate';
            body = { schema: 'public', table: 'your_table' };
            break;
        case 'distribution':
            endpoint = '/prompts/columnValueDistribution/generate';
            body = { schema: 'public', table: 'your_table', column: 'your_column' };
            break;
        case 'timeseries':
            endpoint = '/prompts/timeSeries/generate';
            body = { 
                schema: 'public', 
                table: 'your_table', 
                timestamp_column: 'created_at',
                time_unit: 'day'
            };
            break;
    }

    const data = await fetchAPI(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
    });

    if (data && data.success) {
        // Execute the generated SQL
        const results = await fetchAPI('/query', {
            method: 'POST',
            body: JSON.stringify({ sql: data.data.sql })
        });

        if (results && results.success) {
            renderAnalysisResults(results.data);
        }
    }
});

function renderAnalysisResults(results) {
    analysisResults.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Analysis Results</h5>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                ${results.fields.map(field => `<th>${field.name}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${results.rows.map(row => `
                                <tr>
                                    ${Object.values(row).map(value => `<td>${value}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadSettings();
    checkConnection();
});

// Event Listeners
function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.getAttribute('data-target');
            showTab(target);
        });
    });

    // Query Editor
    document.getElementById('execute-query').addEventListener('click', executeQuery);
    document.getElementById('explain-query').addEventListener('click', explainQuery);
    document.getElementById('format-query').addEventListener('click', formatQuery);
    document.getElementById('save-query').addEventListener('click', saveQuery);

    // Schema Explorer
    document.getElementById('refresh-schemas').addEventListener('click', loadSchemas);
    document.getElementById('schema-list').addEventListener('click', handleSchemaClick);

    // Settings
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('test-connection').addEventListener('click', testConnection);

    // Export
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    document.getElementById('copy-results').addEventListener('click', copyResults);
}

// Tab Management
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-target="${tabId}"]`).classList.add('active');
}

// Connection Management
async function checkConnection() {
    try {
        const response = await fetch('/api/connection/status');
        const data = await response.json();
        updateConnectionStatus(data);
    } catch (error) {
        showToast('Error checking connection status', 'error');
    }
}

function updateConnectionStatus(data) {
    connectionStatus = data;
    const indicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.connection-status span');
    
    if (data.connected) {
        indicator.classList.add('connected');
        indicator.classList.remove('disconnected');
        statusText.textContent = 'Connected';
    } else {
        indicator.classList.add('disconnected');
        indicator.classList.remove('connected');
        statusText.textContent = 'Disconnected';
    }
}

// Query Execution
async function executeQuery() {
    const query = document.getElementById('query-input').value;
    if (!query.trim()) {
        showToast('Please enter a query', 'warning');
        return;
    }

    try {
        showLoading('results-container');
        const response = await fetch('/api/query/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        displayResults(data);
        addToHistory(query);
    } catch (error) {
        showToast('Error executing query', 'error');
    } finally {
        hideLoading('results-container');
    }
}

async function explainQuery() {
    const query = document.getElementById('query-input').value;
    if (!query.trim()) {
        showToast('Please enter a query', 'warning');
        return;
    }

    try {
        showLoading('results-container');
        const response = await fetch('/api/query/explain', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        displayResults(data);
    } catch (error) {
        showToast('Error explaining query', 'error');
    } finally {
        hideLoading('results-container');
    }
}

// Schema Management
async function handleSchemaClick(e) {
    const schemaItem = e.target.closest('.schema-item');
    if (!schemaItem) return;

    const schemaName = schemaItem.getAttribute('data-schema');
    const tablesList = document.getElementById(`tables-${schemaName}`);

    if (tablesList.children.length === 0) {
        try {
            const response = await fetch(`/api/schemas/${schemaName}/tables`);
            const tables = await response.json();
            displayTables(schemaName, tables);
        } catch (error) {
            showToast('Error loading tables', 'error');
        }
    }
}

function displayTables(schemaName, tables) {
    const tablesList = document.getElementById(`tables-${schemaName}`);
    tablesList.innerHTML = tables.map(table => `
        <div class="table-item" data-schema="${schemaName}" data-table="${table.name}">
            <i class="fas fa-table"></i> ${table.name}
        </div>
    `).join('');
}

// Results Display
function displayResults(data) {
    const resultsContainer = document.getElementById('results-container');
    if (data.error) {
        resultsContainer.innerHTML = `
            <div class="alert alert-danger">
                ${data.error}
            </div>
        `;
        return;
    }

    if (data.rows && data.rows.length > 0) {
        const headers = Object.keys(data.rows[0]);
        const table = `
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.rows.map(row => `
                        <tr>
                            ${headers.map(header => `<td>${row[header]}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        resultsContainer.innerHTML = table;
    } else {
        resultsContainer.innerHTML = '<div class="alert alert-info">No results found</div>';
    }
}

// History Management
function addToHistory(query) {
    const historyList = document.getElementById('history-list');
    const timestamp = new Date().toLocaleString();
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
        <div class="timestamp">${timestamp}</div>
        <div class="query">${query}</div>
    `;
    historyList.prepend(historyItem);
}

// Settings Management
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    Object.keys(settings).forEach(key => {
        const input = document.getElementById(key);
        if (input) input.value = settings[key];
    });
}

async function saveSettings() {
    const settings = {
        host: document.getElementById('host').value,
        port: document.getElementById('port').value,
        database: document.getElementById('database').value,
        user: document.getElementById('user').value,
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch('/api/connection/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            localStorage.setItem('settings', JSON.stringify(settings));
            showToast('Settings saved successfully', 'success');
            checkConnection();
        } else {
            showToast('Error saving settings', 'error');
        }
    } catch (error) {
        showToast('Error saving settings', 'error');
    }
}

async function testConnection() {
    const settings = {
        host: document.getElementById('host').value,
        port: document.getElementById('port').value,
        database: document.getElementById('database').value,
        user: document.getElementById('user').value,
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch('/api/connection/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            showToast('Connection successful', 'success');
        } else {
            showToast('Connection failed', 'error');
        }
    } catch (error) {
        showToast('Error testing connection', 'error');
    }
}

// Utility Functions
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
}

function hideLoading(containerId) {
    const container = document.getElementById(containerId);
    const spinner = container.querySelector('.loading-spinner');
    if (spinner) spinner.remove();
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-body">
            ${message}
        </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatQuery() {
    const queryInput = document.getElementById('query-input');
    // Implement query formatting logic here
    showToast('Query formatting not implemented yet', 'warning');
}

function saveQuery() {
    const query = document.getElementById('query-input').value;
    if (!query.trim()) {
        showToast('Please enter a query to save', 'warning');
        return;
    }
    // Implement query saving logic here
    showToast('Query saving not implemented yet', 'warning');
}

function exportToCSV() {
    const resultsContainer = document.getElementById('results-container');
    const table = resultsContainer.querySelector('table');
    if (!table) {
        showToast('No results to export', 'warning');
        return;
    }
    // Implement CSV export logic here
    showToast('CSV export not implemented yet', 'warning');
}

function copyResults() {
    const resultsContainer = document.getElementById('results-container');
    const table = resultsContainer.querySelector('table');
    if (!table) {
        showToast('No results to copy', 'warning');
        return;
    }
    // Implement copy to clipboard logic here
    showToast('Copy to clipboard not implemented yet', 'warning');
} 