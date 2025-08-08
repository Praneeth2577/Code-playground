// DOM Elements
const htmlEditor = document.getElementById('html-code');
const cssEditor = document.getElementById('css-code');
const jsEditor = document.getElementById('js-code');
const previewFrame = document.getElementById('preview-frame');
const runBtn = document.querySelector('.run-btn');
const saveBtn = document.querySelector('.save-btn');
const loadBtn = document.querySelector('.load-btn');
const clearBtn = document.querySelector('.clear-btn');
const refreshBtn = document.querySelector('.refresh-btn');
const tabs = document.querySelectorAll('.tab');
const editors = document.querySelectorAll('.editor');

// Dialog elements
const saveDialog = document.getElementById('save-dialog');
const loadDialog = document.getElementById('load-dialog');
const closeSaveDialog = document.getElementById('close-save-dialog');
const closeLoadDialog = document.getElementById('close-load-dialog');
const projectNameInput = document.getElementById('project-name');
const confirmSaveBtn = document.getElementById('confirm-save');
const cancelSaveBtn = document.getElementById('cancel-save');
const cancelLoadBtn = document.getElementById('cancel-load');
const projectsList = document.getElementById('projects-list');

// Backend API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Initialize editor
function init() {
    // Initial render
    updatePreview();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load saved projects list when load dialog is shown
}

// Tab switching
function switchTab(index) {
    // Remove active class from all tabs and editors
    tabs.forEach(tab => tab.classList.remove('active'));
    editors.forEach(editor => editor.classList.remove('active'));
    
    // Add active class to selected tab and editor
    tabs[index].classList.add('active');
    editors[index].classList.add('active');
}

// Update preview
function updatePreview() {
    const html = htmlEditor.value;
    const css = cssEditor.value;
    const js = jsEditor.value;
    
    const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    previewDoc.open();
    previewDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${css}</style>
        </head>
        <body>
            ${html}
            <script>${js}</script>
        </body>
        </html>
    `);
    previewDoc.close();
}

// Show save dialog
function showSaveDialog() {
    saveDialog.classList.add('active');
    projectNameInput.focus();
}

// Hide save dialog
function hideSaveDialog() {
    saveDialog.classList.remove('active');
    projectNameInput.value = '';
}

// Show load dialog
async function showLoadDialog() {
    loadDialog.classList.add('active');
    await loadProjectsList(); // Load list when dialog is opened
}

// Hide load dialog
function hideLoadDialog() {
    loadDialog.classList.remove('active');
}

// Save project to backend
async function saveProject() {
    const projectName = projectNameInput.value.trim();
    
    if (!projectName) {
        showNotification('Please enter a project name', 'error');
        return;
    }
    
    const projectData = {
        name: projectName,
        html: htmlEditor.value,
        css: cssEditor.value,
        js: jsEditor.value,
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/save-project`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        });

        const result = await response.json();

        if (response.ok) {
            hideSaveDialog();
            showNotification(result.message);
        } else {
            // Handle specific cases like project already exists (if backend sends a specific status/message)
            if (response.status === 500 && result.message.includes('file already exists')) {
                if (!confirm(`Project "${projectName}" already exists. Do you want to overwrite it?`)) {
                    return; // User cancelled overwrite
                }
                // If user confirms overwrite, resend the request (simplified for this example)
                // In a real app, backend might handle overwrite directly or send a specific prompt status
                // For now, we assume backend overwrites by default or you'd need a separate overwrite API
                 const overwriteResponse = await fetch(`${API_BASE_URL}/save-project`, {
                    method: 'POST', // Still POST
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData)
                });
                const overwriteResult = await overwriteResponse.json();
                if(overwriteResponse.ok) {
                    hideSaveDialog();
                    showNotification(overwriteResult.message);
                } else {
                    showNotification(overwriteResult.message || 'Error overwriting project', 'error');
                }
            } else {
                showNotification(result.message || 'Error saving project.', 'error');
            }
        }
    } catch (error) {
        console.error('Network or server error:', error);
        showNotification('Error connecting to the server. Is the backend running?', 'error');
    }
}

// Load projects list from backend and populate dialog
async function loadProjectsList() {
    projectsList.innerHTML = ''; // Clear existing list
    try {
        const response = await fetch(`${API_BASE_URL}/list-projects`);
        const projects = await response.json();

        if (response.ok) {
            if (projects.length === 0) {
                projectsList.innerHTML = '<div class="empty-projects">No saved projects found</div>';
                return;
            }
            
            projects.forEach(projectData => {
                const projectItem = createProjectItem(projectData);
                projectsList.appendChild(projectItem);
            });
        } else {
            showNotification(projects.message || 'Error fetching projects list.', 'error');
        }
    } catch (error) {
        console.error('Network or server error:', error);
        showNotification('Error connecting to the server to load project list.', 'error');
    }
}

// Create project item element
function createProjectItem(projectData) {
    const projectItem = document.createElement('div');
    projectItem.className = 'project-item';
    
    const lastModified = new Date(projectData.lastModified).toLocaleString();
    
    projectItem.innerHTML = `
        <div>
            <div class="project-name">${projectData.name}</div>
            <div class="project-date">Last modified: ${lastModified}</div>
        </div>
        <div class="project-actions">
            <button class="project-btn load-project-btn" onclick="loadProject('${projectData.name.replace(/'/g, "\\'")}')">Load</button>
            <button class="project-btn delete-project-btn" onclick="deleteProject('${projectData.name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
    `;
    
    return projectItem;
}

// Load project from backend
async function loadProject(projectName) {
    try {
        const response = await fetch(`${API_BASE_URL}/load-project/${encodeURIComponent(projectName)}`);
        const projectData = await response.json();

        if (response.ok) {
            // Load code into editors
            htmlEditor.value = projectData.html;
            cssEditor.value = projectData.css;
            jsEditor.value = projectData.js;
            
            // Update preview
            updatePreview();
            
            // Close dialog
            hideLoadDialog();
            
            showNotification(`Project "${projectName}" loaded successfully!`);
        } else {
            showNotification(projectData.message || 'Project not found.', 'error');
        }
    } catch (error) {
        console.error('Network or server error:', error);
        showNotification('Error connecting to the server to load project.', 'error');
    }
}

// Delete project from backend
async function deleteProject(projectName) {
    if (!confirm(`Are you sure you want to delete project "${projectName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/delete-project/${encodeURIComponent(projectName)}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (response.ok) {
            // Refresh the projects list display
            await loadProjectsList();
            showNotification(result.message);
        } else {
            showNotification(result.message || 'Error deleting project.', 'error');
        }
    } catch (error) {
        console.error('Network or server error:', error);
        showNotification('Error connecting to the server to delete project.', 'error');
    }
}

// Clear code
function clearCode() {
    if (confirm('Are you sure you want to clear all code? This cannot be undone.')) {
        // Reset to default code
        htmlEditor.value = '<div class="container">\n    <h1>Welcome to Code Playground!</h1>\n    <p>Start editing HTML, CSS, and JavaScript to see your changes live.</p>\n    <button id="demo-btn" class="btn">Click me!</button>\n</div>';
        
        cssEditor.value = '/* Add your CSS here */\n.container {\n    font-family: Arial, sans-serif;\n    max-width: 800px;\n    margin: 0 auto;\n    padding: 20px;\n    text-align: center;\n}\n\nh1 {\n    color: #316dca;\n}\n\np {\n    color: #333;\n    margin-bottom: 20px;\n}\n\n.btn {\n    background-color: #3a99f4;\n    color: white;\n    border: none;\n    padding: 10px 20px;\n    border-radius: 5px;\n    cursor: pointer;\n}\n\n.btn:hover {\n    background-color: #2980b9;\n}';
        
        jsEditor.value = '// Add your JavaScript here\ndocument.getElementById(\'demo-btn\').addEventListener(\'click\', function() {\n    alert(\'Button clicked!\');\n});';
        
        // Update preview
        updatePreview();
        
        showNotification('Code cleared successfully!');
    }
}

// Enhanced showNotification to support error messages
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    
    // Style based on notification type
    const bgColor = type === 'error' ? '#dc3545' : '#28a745';
    
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: ${bgColor};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 1001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        max-width: 300px;
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => switchTab(index));
    });
    
    // Button events
    runBtn.addEventListener('click', updatePreview);
    saveBtn.addEventListener('click', showSaveDialog);
    loadBtn.addEventListener('click', showLoadDialog); // Now async
    clearBtn.addEventListener('click', clearCode);
    refreshBtn.addEventListener('click', updatePreview);
    
    // Dialog events
    closeSaveDialog.addEventListener('click', hideSaveDialog);
    closeLoadDialog.addEventListener('click', hideLoadDialog);
    cancelSaveBtn.addEventListener('click', hideSaveDialog);
    cancelLoadBtn.addEventListener('click', hideLoadDialog);
    confirmSaveBtn.addEventListener('click', saveProject); // Now async
    
    // Close dialogs when clicking outside
    saveDialog.addEventListener('click', (e) => {
        if (e.target === saveDialog) {
            hideSaveDialog();
        }
    });
    
    loadDialog.addEventListener('click', (e) => {
        if (e.target === loadDialog) {
            hideLoadDialog();
        }
    });
    
    // Enter key in project name input
    projectNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveProject();
        }
    });
    
    // Auto-update with delay
    let updateTimer;
    const updateDelay = 1000; // 1 second delay
    
    function delayedUpdate() {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(updatePreview, updateDelay);
    }
    
    // Add event listeners to all editors
    [htmlEditor, cssEditor, jsEditor].forEach(editor => {
        editor.addEventListener('input', delayedUpdate);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            showSaveDialog();
        }
        
        // Ctrl/Cmd + O to load
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            showLoadDialog();
        }
        
        // Ctrl/Cmd + Enter to run
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            updatePreview();
        }
        
        // Escape to close dialogs
        if (e.key === 'Escape') {
            hideSaveDialog();
            hideLoadDialog();
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);