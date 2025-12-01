console.log("Popup script loaded.");

const notesListDiv = document.getElementById('notes-list');

class NotesApp {
    constructor() {
        this.notesList = [];
        this.baseURL = `http://localhost:8000`;
    }

    async urlPath(endpoint) {
        return `${this.baseURL}${endpoint}`;
    }

    async loadNotes() {
        const data = await fetch(this.urlPath('/notes'))
        console.log(data);
    }
}

const app = new NotesApp();
app.loadNotes();