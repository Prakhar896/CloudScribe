import os, json, datetime, time, threading, copy
from typing_extensions import Literal
from .client import CloudFragment
from .background import ThreadManager, Trigger
from .models import Note, Journal

# Schema:
# - journals: dict
#     - <journal_id>: dict
#         - title: str
#         - description: str
#         - author: str
#         - created: str
#         - keyphrase: str
#         - notes: dict
#             - id: str
#             - title: str
#             - content: str
#             - created: str
#             - modified: str | None = None
#             - tags: list[str] = []

class ScribeDB:
    credentialsFile = "credentials.json"
    fragment: CloudFragment | None = None
    _operational = False
    _streamLock = threading.Lock()
    
    @staticmethod
    def isOperational() -> bool:
        return ScribeDB._operational
    
    @staticmethod
    def connectionModeIsHTTP() -> bool:
        return os.getenv("DB_MODE", "HTTP").upper() == "HTTP"
    
    @staticmethod
    def saveFragCreds(fragment: CloudFragment) -> None:
        with open(ScribeDB.credentialsFile, "w") as f:
            json.dump({
                "fragID": fragment.fragmentID,
                "secret": fragment.secret,
                "apiKey": fragment.apiKey
            }, f)
    
    @staticmethod
    def initFragFromCreds() -> CloudFragment:
        with open(ScribeDB.credentialsFile, "r") as f:
            creds = json.load(f)
        
        return CloudFragment(
            apiKey=creds["apiKey"],
            fragmentID=creds["fragID"],
            secret=creds["secret"]
        )
    
    @staticmethod
    def live_reader():
        try:
            ScribeDB.refresh_local()
        except Exception as e:
            print("SCRIBEDB LIVE_READER ERROR: {}".format(e))
    
    @staticmethod
    def setup():
        if not os.path.isfile(ScribeDB.credentialsFile):
            with open(ScribeDB.credentialsFile, 'w') as f:
                json.dump({}, f)
            
            ScribeDB.fragment = CloudFragment(reason="Database storage for Scribe server. Request made: {}".format(datetime.datetime.now(datetime.timezone.utc).isoformat()))
            
            # Fragment request flow
            secretKey = input("SCRIBEDB SETUP: Enter secret key for db encryption: ")
            if not secretKey.strip():
                raise Exception("SCRIBEDB SETUP FATALERROR: Secret key cannot be empty.")
            
            ScribeDB.fragment.secret = secretKey
            res = ScribeDB.fragment.request()
            if res.startswith("ERROR"):
                raise Exception("SCRIBEDB SETUP FATALERROR: Fragment request failed with error: {}".format(res))
            
            input("SCRIBEDB SETUP: Fragment request successful. Please approve and hit Enter to continue...")
            
            res = ScribeDB.fragment.read()
            if isinstance(res, str) and res.startswith("ERROR"):
                raise Exception("SCRIBEDB SETUP FATALERROR: Fragment read failed with error: {}".format(res))
            
            ScribeDB.saveFragCreds(ScribeDB.fragment)
        else:
            ScribeDB.fragment = ScribeDB.initFragFromCreds()
            
            res = ScribeDB.fragment.read()
            if isinstance(res, str) and res.startswith("ERROR"):
                raise Exception("SCRIBEDB SETUP FATALERROR: Fragment read failed with error: {}".format(res))
        
        ScribeDB._operational = True
        print("SCRIBEDB SETUP: DB read successful.")
        
        if not ScribeDB.connectionModeIsHTTP():
            res = ScribeDB.fragment.initStream()
            if isinstance(res, str):
                raise Exception("SCRIBEDB SETUP FATALERROR: Fragment stream init failed with error: {}".format(res))
            
            print("SCRIBEDB SETUP: Fragment stream initialized.")
        
        ThreadManager.defaultProcessor.addJob(
            ScribeDB.live_reader,
            trigger=Trigger('interval', seconds=int(os.getenv("DB_REFRESH_INTERVAL", "30")))
        )
        
        return True
    
    @staticmethod
    def refresh_local() -> Literal[True]:
        if not ScribeDB.isOperational():
            raise Exception("SCRIBEDB REFRESH_LOCAL ERROR: Database not operational.")
        
        if ScribeDB.connectionModeIsHTTP():
            res = ScribeDB.fragment.read()
            if isinstance(res, str) and res.startswith("ERROR"):
                raise Exception("SCRIBEDB REFRESH_LOCAL ERROR: Fragment read failed with error: {}".format(res))
        else:
            with ScribeDB._streamLock:
                res = ScribeDB.fragment.readWS()
                if isinstance(res, str) and res.startswith("ERROR"):
                    raise Exception("SCRIBEDB REFRESH_LOCAL ERROR: Fragment readWS failed with error: {}".format(res))
                time.sleep(0.5)
        
        return True
    
    @staticmethod
    def write(data: dict | None = None):
        if not ScribeDB.isOperational():
            raise Exception("SCRIBEDB WRITE ERROR: Database not operational.")
        
        if data is None:
            data = ScribeDB.fragment.data
        
        if ScribeDB.connectionModeIsHTTP():
            res = ScribeDB.fragment.write(data)
            if isinstance(res, str) and res.startswith("ERROR"):
                raise Exception("SCRIBEDB WRITE ERROR: Fragment write failed with error: {}".format(res))
        else:
            with ScribeDB._streamLock:
                res = ScribeDB.fragment.writeWS(data)
                if isinstance(res, str) and res.startswith("ERROR"):
                    raise Exception("SCRIBEDB WRITE ERROR: Fragment writeWS failed with error: {}".format(res))
                time.sleep(0.5)
        
        return True
    
    @staticmethod
    def read() -> dict:
        ScribeDB.refresh_local()
        return ScribeDB.fragment.data
    
    @staticmethod
    def deserialized_data() -> list[Journal]:
        data = copy.deepcopy(ScribeDB.fragment.data)
        journals = []
        
        if "journals" not in data or not isinstance(data["journals"], dict):
            return journals
        
        for _, journalDict in data["journals"].items():
            journals.append(Journal.from_dict(journalDict))
        
        return journals
    
    @staticmethod
    def retrieve_journal(journal_id: str) -> Journal | None:
        journals = ScribeDB.deserialized_data()
        for journal in journals:
            if journal.id == journal_id:
                return journal
        
        return None
    
    @staticmethod
    def retrieve_journal_with_auth(journal_id: str, keyphrase: str) -> Journal | None:
        journal = ScribeDB.retrieve_journal(journal_id)
        if journal is None:
            return None
        
        if journal.keyphrase != keyphrase:
            return None
        
        return journal
    
    @staticmethod
    def retrieve_note(journal_id: str, note_id: str) -> Note | None:
        journal = ScribeDB.retrieve_journal(journal_id)
        if journal is None:
            return None
        
        for note in journal.notes:
            if note.id == note_id:
                return note
        
        return None
    
    @staticmethod
    def retrieve_note_with_auth(journal_id: str, note_id: str, keyphrase: str) -> Note | None:
        journal = ScribeDB.retrieve_journal_with_auth(journal_id, keyphrase)
        if journal is None:
            return None
        
        for note in journal.notes:
            if note.id == note_id:
                return note
        
        return None
    
    @staticmethod
    def save_journal(journal: Journal) -> None:
        data = copy.deepcopy(ScribeDB.fragment.data)
        
        if "journals" not in data:
            data["journals"] = {}
        
        if not isinstance(data["journals"], dict):
            data["journals"] = {}
        
        data["journals"][journal.id] = journal.to_dict()
        
        ScribeDB.write(data)
    
    @staticmethod
    def save_note(note: Note, journal_id: str, keyphrase: str | None=None) -> None:
        journal = ScribeDB.retrieve_journal(journal_id) if keyphrase is None else ScribeDB.retrieve_journal_with_auth(journal_id, keyphrase)
        if journal is None:
            raise Exception("SCRIBEDB SAVE_NOTE ERROR: Journal with ID '{}' not found. Potential authentication failure.".format(journal_id))
        
        # Check if note with same ID exists, update if so
        for idx, existing_note in enumerate(journal.notes):
            if existing_note.id == note.id:
                journal.notes[idx] = note
                ScribeDB.save_journal(journal)
                return
        
        # Otherwise, add new note
        journal.notes.append(note)
        ScribeDB.save_journal(journal)
    
    @staticmethod
    def save_entries(journal_id: str, notes: list[Note], keyphrase: str | None=None) -> None:
        journal = ScribeDB.retrieve_journal(journal_id) if keyphrase is None else ScribeDB.retrieve_journal_with_auth(journal_id, keyphrase)
        if journal is None:
            raise Exception("SCRIBEDB SAVE_ENTRIES ERROR: Journal with ID '{}' not found. Potential authentication failure.".format(journal_id))
        
        journal.notes = notes
        ScribeDB.save_journal(journal)
    
    @staticmethod
    def shutdown():
        if not ScribeDB.isOperational():
            return
        
        if not ScribeDB.connectionModeIsHTTP() and ScribeDB.fragment.stream is not None:
            ScribeDB.fragment.stream.disconnect()
            
            if os.getenv("DEBUG_MODE", "False").lower() == "true":
                with open("ScribeDBStreamLog.txt", "w") as f:
                    content = "\n".join(ScribeDB.fragment.stream.history)
                    f.write(content)
            
            print("SCRIBEDB SHUTDOWN: Fragment stream disconnected.")