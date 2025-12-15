const API_BASE = 'http://127.0.0.1:8000';

// State management
const state = {
    user: null,
    username: null,
    keyphrase: null,
    currentJournal: null,
    currentNote: null,
    journals: [],
    notes: [],
    editMode: false,
    noteTags: []
};

// Load saved credentials
function loadCredentials() {
    const saved = localStorage.getItem('cloudscribe_auth');
    if (saved) {
        const auth = JSON.parse(saved);
        state.username = auth.username;
        state.keyphrase = auth.keyphrase;
        return true;
    }
    return false;
}

// Save credentials
function saveCredentials(username, keyphrase) {
    localStorage.setItem('cloudscribe_auth', JSON.stringify({ username, keyphrase }));
    state.username = username;
    state.keyphrase = keyphrase;
}

// Clear credentials
function clearCredentials() {
    localStorage.removeItem('cloudscribe_auth');
    state.username = null;
    state.keyphrase = null;
    state.user = null;
}

// API helpers
async function apiCall(endpoint, method = 'GET', body = null, requiresAuth = true) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (requiresAuth && state.username && state.keyphrase) {
        options.headers['username'] = state.username;
        options.headers['keyphrase'] = state.keyphrase;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
        throw new Error(error.detail || 'An error occurred');
    }

    return response.json();
}

// UI helpers
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="error">${message}<br><small>Please try again.</small></div>`;
    setTimeout(() => container.innerHTML = '', 5000);
}

function showSuccess(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="success">${message}</div>`;
    setTimeout(() => container.innerHTML = '', 3000);
}

function clearError(containerId) {
    document.getElementById(containerId).innerHTML = '';
}

function updateHeader(title, showAdd = false, showBack = false, showLogout = false) {
    document.getElementById('header-title').textContent = title;
    document.getElementById('add-btn').style.display = showAdd ? 'flex' : 'none';
    document.getElementById('back-btn').style.display = showBack ? 'flex' : 'none';
    document.getElementById('logout-btn').style.display = showLogout ? 'flex' : 'none';
}

function updateBreadcrumb(items) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (items.length === 0) {
        breadcrumb.style.display = 'none';
        return;
    }
    breadcrumb.style.display = 'flex';
    breadcrumb.innerHTML = items.map((item, index) => {
        const separator = index < items.length - 1 ? ' → ' : '';
        return `<span data-action="${item.action}">${item.text}</span>${separator}`;
    }).join('');

    breadcrumb.querySelectorAll('span').forEach(span => {
        span.addEventListener('click', () => {
            const action = span.getAttribute('data-action');
            if (action === 'journals') showJournals();
            else if (action === 'notes') showNotes(state.currentJournal);
        });
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Authentication
async function login() {
    const username = document.getElementById('auth-username').value.trim();
    const keyphrase = document.getElementById('auth-keyphrase').value;

    if (!username || !keyphrase) {
        showError('auth-error', 'Please enter both username and keyphrase.');
        return;
    }

    clearError('auth-error');

    try {
        // Try to fetch user info to verify credentials
        state.username = username;
        state.keyphrase = keyphrase;

        const journals = await apiCall('/journals');

        saveCredentials(username, keyphrase);
        showJournals();
    } catch (error) {
        clearCredentials();
        showError('auth-error', `Login failed: ${error.message}`);
    }
}

async function register() {
    const username = document.getElementById('auth-username').value.trim();
    const keyphrase = document.getElementById('auth-keyphrase').value;

    if (!username || !keyphrase) {
        showError('auth-error', 'Please enter both username and keyphrase.');
        return;
    }

    clearError('auth-error');

    try {
        const user = await apiCall('/new/user', 'POST', { username, keyphrase }, false);
        saveCredentials(username, keyphrase);
        state.user = user;
        showSuccess('auth-error', 'Account created successfully!');
        setTimeout(() => showJournals(), 1000);
    } catch (error) {
        showError('auth-error', `Registration failed: ${error.message}`);
    }
}

function logout() {
    clearCredentials();
    state.journals = [];
    state.notes = [];
    state.currentJournal = null;
    state.currentNote = null;
    updateHeader('CloudScribe');
    updateBreadcrumb([]);
    showView('auth-view');
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-keyphrase').value = '';
}

// Journals
async function showJournals() {
    updateHeader('My Journals', true, false, true);
    updateBreadcrumb([]);
    showView('journals-view');
    clearError('journals-error');

    const container = document.getElementById('journals-list');
    container.innerHTML = '<div class="loading">Loading journals...</div>';

    try {
        state.journals = await apiCall('/journals');

        if (state.journals.length === 0) {
            container.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">📔</div>
                            <p>No journals yet.</p>
                            <p>Click + to create your first journal!</p>
                        </div>
                    `;
        } else {
            container.innerHTML = state.journals.map(journal => `
                        <div class="journal-item" data-id="${journal.id}">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div style="flex: 1; min-width: 0;">
                                    <h3>${journal.title}</h3>
                                    <p>${journal.description || 'No description'}</p>
                                    <p style="margin-top: 6px; font-size: 11px;">Created: ${formatDate(journal.created)}</p>
                                </div>
                                <button class="icon-btn" style="margin-left: 8px; background: rgba(220, 53, 69, 0.1); color: #dc3545; flex-shrink: 0;" data-delete-id="${journal.id}" title="Delete Journal">X</button>
                            </div>
                        </div>
                    `).join('');

            container.querySelectorAll('.journal-item').forEach(item => {
                const journalDiv = item.querySelector('div > div');
                journalDiv.addEventListener('click', () => {
                    const journal = state.journals.find(j => j.id === item.dataset.id);
                    showNotes(journal);
                });

                const deleteBtn = item.querySelector('[data-delete-id]');
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const journalId = deleteBtn.dataset.deleteId;
                    // const journal = state.journals.find(j => j.id === journalId);

                    try {
                        await apiCall(`/journal/${journalId}`, 'DELETE');
                        showSuccess('journals-error', 'Journal deleted successfully!');
                        setTimeout(() => showJournals(), 1000);
                    } catch (error) {
                        showError('journals-error', `Failed to delete journal: ${error.message}`);
                    }
                });
            });
        }
    } catch (error) {
        showError('journals-error', `Failed to load journals: ${error.message}`);
        container.innerHTML = '';
    }
}

function showJournalForm(journal = null) {
    state.editMode = !!journal;
    updateHeader(journal ? 'Edit Journal' : 'New Journal', false, true, true);
    updateBreadcrumb([{ text: 'Journals', action: 'journals' }]);
    showView('journal-form-view');
    clearError('journal-form-error');

    document.getElementById('journal-title').value = journal ? journal.title : '';
    document.getElementById('journal-description').value = journal ? (journal.description || '') : '';
    state.currentJournal = journal;
}

async function saveJournal() {
    const title = document.getElementById('journal-title').value.trim();
    const description = document.getElementById('journal-description').value.trim();

    if (!title) {
        showError('journal-form-error', 'Please enter a journal title.');
        return;
    }

    clearError('journal-form-error');

    try {
        if (state.editMode && state.currentJournal) {
            await apiCall(`/journal/${state.currentJournal.id}`, 'PUT', { title, description });
            showSuccess('journal-form-error', 'Journal updated successfully!');
        } else {
            await apiCall('/new/journal', 'POST', { title, description });
            showSuccess('journal-form-error', 'Journal created successfully!');
        }
        setTimeout(() => showJournals(), 1000);
    } catch (error) {
        showError('journal-form-error', `Failed to save journal: ${error.message}`);
    }
}

// Notes
async function showNotes(journal) {
    state.currentJournal = journal;
    updateHeader(journal.title, true, true, true);
    updateBreadcrumb([{ text: 'Journals', action: 'journals' }]);
    showView('notes-view');
    clearError('notes-error');

    const container = document.getElementById('notes-list');
    container.innerHTML = '<div class="loading">Loading notes...</div>';

    try {
        state.notes = await apiCall(`/journal/${journal.id}/notes`);

        // Sort in reverse chronological order
        state.notes.sort((a, b) => new Date(b.created) - new Date(a.created));

        if (state.notes.length === 0) {
            container.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">📝</div>
                            <p>No notes yet.</p>
                            <p>Click + to create your first note!</p>
                        </div>
                    `;
        } else {
            container.innerHTML = state.notes.map(note => {
                const preview = note.content.substring(0, 100);
                return `
                            <div class="note-item" data-id="${note.id}">
                                <h3>${note.title}</h3>
                                <p>Created: ${formatDate(note.created)}</p>
                                ${note.tags.length > 0 ? `
                                    <div class="tags">
                                        ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                                    </div>
                                ` : ''}
                                <div class="note-preview">${preview}${note.content.length > 100 ? '...' : ''}</div>
                            </div>
                        `;
            }).join('');

            container.querySelectorAll('.note-item').forEach(item => {
                item.addEventListener('click', () => {
                    const note = state.notes.find(n => n.id === item.dataset.id);
                    showNoteDetail(note);
                });
            });
        }
    } catch (error) {
        showError('notes-error', `Failed to load notes: ${error.message}`);
        container.innerHTML = '';
    }
}

function showNoteForm(note = null) {
    state.editMode = !!note;
    state.currentNote = note;
    state.noteTags = note ? [...note.tags] : [];

    updateHeader(note ? 'Edit Note' : 'New Note', false, true, true);
    updateBreadcrumb([
        { text: 'Journals', action: 'journals' },
        { text: state.currentJournal.title, action: 'notes' }
    ]);
    showView('note-form-view');
    clearError('note-form-error');

    document.getElementById('note-title').value = note ? note.title : '';
    document.getElementById('note-content').value = note ? note.content : '';
    document.getElementById('note-tag-input').value = '';
    renderTags();
}

function renderTags() {
    const container = document.getElementById('note-tags');
    if (state.noteTags.length === 0) {
        container.innerHTML = '<p style="font-size: 12px; color: #999;">No tags added</p>';
    } else {
        container.innerHTML = state.noteTags.map((tag, index) =>
            `<span class="tag" style="cursor: pointer;" data-index="${index}">${tag} ×</span>`
        ).join('');

        container.querySelectorAll('.tag').forEach(tagEl => {
            tagEl.addEventListener('click', () => {
                const index = parseInt(tagEl.dataset.index);
                state.noteTags.splice(index, 1);
                renderTags();
            });
        });
    }
}

function addTag() {
    const input = document.getElementById('note-tag-input');
    const tag = input.value.trim();

    if (tag && !state.noteTags.includes(tag)) {
        state.noteTags.push(tag);
        input.value = '';
        renderTags();
    }
}

async function saveNote() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();

    if (!title) {
        showError('note-form-error', 'Please enter a note title.');
        return;
    }

    if (!content) {
        showError('note-form-error', 'Please enter note content.');
        return;
    }

    clearError('note-form-error');

    try {
        if (state.editMode && state.currentNote) {
            await apiCall(
                `/journal/${state.currentJournal.id}/note/${state.currentNote.id}`,
                'PUT',
                { title, content, tags: state.noteTags }
            );
            showSuccess('note-form-error', 'Note updated successfully!');
        } else {
            await apiCall('/new/note', 'POST', {
                journal_id: state.currentJournal.id,
                title,
                content,
                tags: state.noteTags
            });
            showSuccess('note-form-error', 'Note created successfully!');
        }
        setTimeout(() => showNotes(state.currentJournal), 1000);
    } catch (error) {
        showError('note-form-error', `Failed to save note: ${error.message}`);
    }
}

function showNoteDetail(note) {
    state.currentNote = note;
    updateHeader('Note', false, true, true);
    updateBreadcrumb([
        { text: 'Journals', action: 'journals' },
        { text: state.currentJournal.title, action: 'notes' }
    ]);
    showView('note-detail-view');
    clearError('note-detail-error');

    const container = document.getElementById('note-detail-content');
    container.innerHTML = `
                <div class="note-detail">
                    <h2>${note.title}</h2>
                    <div class="meta">
                        Created: ${formatDate(note.created)}
                        ${note.modified ? ` • Modified: ${formatDate(note.modified)}` : ''}
                    </div>
                    ${note.tags.length > 0 ? `
                        <div class="tags">
                            ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="content">${note.content}</div>
                </div>
                <div class="note-actions">
                    <button class="btn" id="edit-note-detail-btn">Edit</button>
                    <button class="btn btn-danger" id="delete-note-detail-btn">Delete</button>
                </div>
            `;

    document.getElementById('edit-note-detail-btn').addEventListener('click', () => {
        showNoteForm(note);
    });

    document.getElementById('delete-note-detail-btn').addEventListener('click', async () => {
        try {
            await apiCall(
                `/journal/${state.currentJournal.id}/note/${note.id}`,
                'DELETE'
            );
            showNotes(state.currentJournal);
        } catch (error) {
            showError('note-detail-error', `Failed to delete note: ${error.message}`);
        }
    });
}

// Event listeners
document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('register-btn').addEventListener('click', register);
document.getElementById('logout-btn').addEventListener('click', logout);

document.getElementById('add-btn').addEventListener('click', () => {
    const currentView = document.querySelector('.view.active').id;
    if (currentView === 'journals-view') {
        showJournalForm();
    } else if (currentView === 'notes-view') {
        showNoteForm();
    }
});

document.getElementById('back-btn').addEventListener('click', () => {
    const currentView = document.querySelector('.view.active').id;
    if (currentView === 'journal-form-view') {
        showJournals();
    } else if (currentView === 'note-form-view' || currentView === 'note-detail-view') {
        showNotes(state.currentJournal);
    } else if (currentView === 'notes-view') {
        showJournals();
    }
});

document.getElementById('save-journal-btn').addEventListener('click', saveJournal);
document.getElementById('cancel-journal-btn').addEventListener('click', () => showJournals());

document.getElementById('save-note-btn').addEventListener('click', saveNote);
document.getElementById('cancel-note-btn').addEventListener('click', () => showNotes(state.currentJournal));

document.getElementById('add-tag-btn').addEventListener('click', addTag);
document.getElementById('note-tag-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
    }
});

// Allow Enter to submit on auth forms
document.getElementById('auth-keyphrase').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});

// Initialize
if (loadCredentials()) {
    showJournals();
}