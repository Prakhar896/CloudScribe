console.log("Popup script loaded.");

const notesListDiv = document.getElementById('notes-list');
const statusLabel = document.getElementById('statusLabel');
const addNoteButton = document.getElementById('addNoteButton');

class NotesApp {
    constructor() {
        this.notesList = [];
        this.baseURL = `http://localhost:8000`;
    }

    urlPath(endpoint) {
        return `${this.baseURL}${endpoint}`;
    }

    showStatus(message) {
        statusLabel.style.display = 'block';
        statusLabel.style.visibility = 'visible';
        statusLabel.innerText = message;
    }

    hideStatus() {
        statusLabel.style.display = 'none';
        statusLabel.style.visibility = 'hidden';
        statusLabel.innerText = '';
    }

    async loadNotes() {
        var response;
        try {
            response = await fetch(this.urlPath('/notes'));

            if (!response.ok) {
                response.json()
                    .then(data => {
                        if (data && data.detail) {
                            throw new Error(`${response.status} error with message: ${data.detail}`);
                        } else {
                            throw new Error(`${response.status} error while fetching notes.`);
                        }
                    })
            }
        } catch (err) {
            this.showStatus('Error loading notes. Please try again later.');
            console.error('Error fetching notes:', err);
            return;
        }

        try {
            const notes = await response.json();
            this.notesList = notes;
            this.renderNotes();
            this.hideStatus();
        } catch (err) {
            this.showStatus('Error processing notes data.');
            console.error('Error parsing notes JSON:', err);
        }
    }

    async addNote() {
        const title = prompt("Enter note title:");
        const content = prompt("Enter note content:");
        var tags = prompt("Enter tags (comma separated):");
        if (tags) {
            tags = tags.split(',').map(tag => tag.trim());
        } else {
            tags = [];
        }

        const noteData = {
            title: title,
            content: content,
            tags: tags
        };

        this.showStatus('Adding note...');

        var response;
        try {
            response = await fetch(this.urlPath('/notes/new'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noteData)
            });

            if (!response.ok) {
                response.json()
                    .then(data => {
                        if (data && data.detail) {
                            throw new Error(`${response.status} error with message: ${data.detail}`);
                        } else {
                            throw new Error(`${response.status} error while adding note.`);
                        }
                    })
            }
        } catch (err) {
            this.showStatus('Error adding note. Please try again later.');
            console.error('Error adding note:', err);
            return;
        }

        this.hideStatus();
        await this.loadNotes();
    }

    async editNote(noteData) {
        const newTitle = prompt("Edit note title:", noteData.title);
        const newContent = prompt("Edit note content:", noteData.content);
        var newTags = prompt("Edit tags (comma separated):", noteData.tags.join(', '));
        if (newTags) {
            newTags = newTags.split(',').map(tag => tag.trim());
        } else {
            newTags = [];
        }

        const updatedNoteData = {
            title: newTitle,
            content: newContent,
            tags: newTags
        };

        this.showStatus('Updating note...');
        var response;
        try {
            response = await fetch(this.urlPath(`/notes/${noteData.id}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedNoteData)
            });

            if (!response.ok) {
                response.json()
                    .then(data => {
                        if (data && data.detail) {
                            throw new Error(`${response.status} error with message: ${data.detail}`);
                        } else {
                            throw new Error(`${response.status} error while updating note.`);
                        }
                    })
            }
        } catch (err) {
            this.showStatus('Error updating note. Please try again later.');
            console.error('Error updating note:', err);
            return;
        }

        this.hideStatus();
        await this.loadNotes();
    }

    async deleteNote(noteData) {
        const confirmDelete = confirm(`Are you sure you want to delete the note titled "${noteData.title}"?`);
        if (!confirmDelete) {
            return;
        }
        
        this.showStatus('Deleting note...');
        var response;
        try {
            response = await fetch(this.urlPath(`/notes/${noteData.id}`), {
                method: 'DELETE'
            });

            if (!response.ok) {
                response.json()
                    .then(data => {
                        if (data && data.detail) {
                            throw new Error(`${response.status} error with message: ${data.detail}`);
                        } else {
                            throw new Error(`${response.status} error while deleting note.`);
                        }
                    })
            }
        } catch (err) {
            this.showStatus('Error deleting note. Please try again later.');
            console.error('Error deleting note:', err);
            return;
        }

        this.hideStatus();
        await this.loadNotes();
    }

    renderNotes() {
        notesListDiv.innerHTML = '';
        
        if (this.notesList.length === 0) {
            notesListDiv.innerHTML = '<p>No notes available.</p>';
            return;
        }

        this.notesList.forEach(note => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-item';
            noteDiv.innerHTML = `
                <h3>${note.title}</h3>
                <p><strong>Tags:</strong> ${note.tags.join(', ')}</p>
                <p>${note.content}</p>
                <small>Last edited: ${note.modified ? new Date(note.modified).toLocaleString() : 'Never'}</small>
                <br>
                <small>Created: ${new Date(note.created).toLocaleString()}</small>
                <br>
            `;

            const editButton = document.createElement('button');
            editButton.innerText = 'Edit';
            editButton.addEventListener('click', () => {
                this.editNote(note);
            });

            const deleteButton = document.createElement('button');
            deleteButton.innerText = 'Delete';
            deleteButton.addEventListener('click', () => {
                this.deleteNote(note);
            });

            noteDiv.appendChild(editButton);
            noteDiv.appendChild(deleteButton);
            noteDiv.appendChild(document.createElement('hr'));
            
            notesListDiv.appendChild(noteDiv);
        });
    }
}

const app = new NotesApp();
app.loadNotes();
addNoteButton.addEventListener('click', () => {
    app.addNote();
})