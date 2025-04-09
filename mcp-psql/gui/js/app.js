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
    loadSchemas();
}); 