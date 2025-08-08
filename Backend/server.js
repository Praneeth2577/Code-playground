const express = require('express');
const fs = require('fs/promises'); // For async file operations
const path = require('path');
const cors = require('cors'); // For allowing frontend to talk to backend

const app = express();
const PORT = 3000;

const PROJECTS_DIR = path.join(__dirname, 'saved_projects'); 


fs.mkdir(PROJECTS_DIR, { recursive: true })
  .then(() => console.log(`Ensured projects directory exists at: ${PROJECTS_DIR}`))
  .catch(err => console.error('Error ensuring projects directory:', err));

// Middleware
app.use(cors()); // Enable CORS for development (allows your frontend to communicate)
app.use(express.json()); // To parse JSON request bodies

// --- API Endpoints ---

// POST /api/save-project
// Saves HTML, CSS, JS to a new folder under PROJECTS_DIR
app.post('/api/save-project', async (req, res) => {
    const { name, html, css, js } = req.body;

    if (!name || html === undefined || css === undefined || js === undefined) {
        return res.status(400).json({ message: 'Missing project data: name, html, css, or js' });
    }

    // Basic sanitization for project name to prevent path traversal issues
    const safeProjectName = name.replace(/[^a-zA-Z0-9_-]/g, '_'); 
    const projectFolderPath = path.join(PROJECTS_DIR, safeProjectName);

    try {
        await fs.mkdir(projectFolderPath, { recursive: true });
        await fs.writeFile(path.join(projectFolderPath, 'index.html'), html);
        await fs.writeFile(path.join(projectFolderPath, 'style.css'), css);
        await fs.writeFile(path.join(projectFolderPath, 'script.js'), js);

        // Update a metadata file for easier project listing and last modified time
        const metadata = {
            name: name, // Store original name if sanitized
            lastModified: new Date().toISOString()
        };
        await fs.writeFile(path.join(projectFolderPath, 'metadata.json'), JSON.stringify(metadata, null, 2));

        res.status(200).json({ message: `Project "${name}" saved successfully!` });
    } catch (error) {
        console.error('Error saving project:', error);
        res.status(500).json({ message: 'Error saving project.' });
    }
});

// GET /api/list-projects
// Lists all saved projects with their last modified date
app.get('/api/list-projects', async (req, res) => {
    try {
        const files = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
        const projects = [];

        for (const file of files) {
            if (file.isDirectory()) {
                const projectFolderPath = path.join(PROJECTS_DIR, file.name);
                try {
                    const metadataContent = await fs.readFile(path.join(projectFolderPath, 'metadata.json'), 'utf8');
                    const metadata = JSON.parse(metadataContent);
                    projects.push({
                        name: metadata.name || file.name, // Use original name if available in metadata
                        lastModified: metadata.lastModified || (await fs.stat(projectFolderPath)).mtime.toISOString()
                    });
                } catch (metaError) {
                    // If metadata.json doesn't exist, fall back to folder name and mtime
                    console.warn(`Metadata not found for ${file.name}, falling back to folder name and mtime.`);
                    projects.push({
                        name: file.name,
                        lastModified: (await fs.stat(projectFolderPath)).mtime.toISOString()
                    });
                }
            }
        }
        // Sort projects by last modified date, newest first
        projects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
        res.status(200).json(projects);
    } catch (error) {
        console.error('Error listing projects:', error);
        res.status(500).json({ message: 'Error listing projects.' });
    }
});

// GET /api/load-project/:projectName
// Loads HTML, CSS, JS for a given project name
app.get('/api/load-project/:projectName', async (req, res) => {
    const projectName = req.params.projectName;
    // Basic sanitization for project name when loading
    const safeProjectName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const projectFolderPath = path.join(PROJECTS_DIR, safeProjectName);

    try {
        const html = await fs.readFile(path.join(projectFolderPath, 'index.html'), 'utf8');
        const css = await fs.readFile(path.join(projectFolderPath, 'style.css'), 'utf8');
        const js = await fs.readFile(path.join(projectFolderPath, 'script.js'), 'utf8');
        res.status(200).json({ html, css, js });
    } catch (error) {
        console.error('Error loading project:', error);
        res.status(404).json({ message: 'Project not found.' });
    }
});

// DELETE /api/delete-project/:projectName
// Deletes a project folder
app.delete('/api/delete-project/:projectName', async (req, res) => {
    const projectName = req.params.projectName;
    // Basic sanitization for project name when deleting
    const safeProjectName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const projectFolderPath = path.join(PROJECTS_DIR, safeProjectName);

    try {
        await fs.rm(projectFolderPath, { recursive: true, force: true });
        res.status(200).json({ message: `Project "${projectName}" deleted successfully.` });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Error deleting project.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`Project files will be saved in: ${PROJECTS_DIR}`);
});