import os, json, datetime, time, threading, copy
from typing_extensions import Literal
from .client import CloudFragment
from .background import ThreadManager, Trigger
from .models import Note

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
    def load_entries() -> list[Note]:
        data = copy.deepcopy(ScribeDB.fragment.data)
        if "notes" not in data or not isinstance(data["notes"], dict):
            return []
        
        notes = []
        for _, noteDict in data["notes"].items():
            notes.append(Note.from_dict(noteDict))
        
        return notes
    
    @staticmethod
    def save_entry(note: Note) -> None:
        data = copy.deepcopy(ScribeDB.fragment.data)
        
        if "notes" not in data:
            data["notes"] = []
        
        if not isinstance(data["notes"], dict):
            data["notes"] = {}
        
        data["notes"][note.id] = note.to_dict()
        
        ScribeDB.write(data)
    
    @staticmethod
    def delete_entry(note_id: str) -> None:
        data = copy.deepcopy(ScribeDB.fragment.data)
        
        if "notes" not in data or not isinstance(data["notes"], dict):
            return
        
        if note_id in data["notes"]:
            del data["notes"][note_id]
        
        ScribeDB.write(data)
    
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