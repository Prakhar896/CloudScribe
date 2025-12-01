import uuid, datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.base import BaseTrigger
from apscheduler.triggers.date import DateTrigger

class Trigger:
    '''
    A class to define triggers for `APScheduler` based jobs.
    
    Implementation variations:
    ```python
    from apscheduler.triggers.date import DateTrigger
    import datetime
    from services import Trigger
    
    ## Immediate trigger
    immediateTrigger = Trigger()
    
    ## Interval trigger
    intervalTrigger = Trigger(type='interval', seconds=5, minutes=3, hours=2) # Triggers every 2 hours 3 minutes and 5 seconds (cumulatively)
    
    ## Date trigger
    dateTrigger = Trigger(type='date', triggerDate=(datetime.datetime.now() + datetime.timedelta(seconds=5))) # Triggers 5 seconds later
    
    ## Custom trigger
    customTrigger = Trigger(customAPTrigger=DateTrigger(run_date=(datetime.datetime.now() + datetime.timedelta(seconds=5))) # Custom APScheduler trigger
    ```
    '''
    
    def __init__(self, type='interval', seconds=None, minutes=None, hours=None, triggerDate: datetime.datetime=None, customAPTrigger: BaseTrigger=None) -> None:
        self.type = type
        self.immediate = seconds == None and minutes == None and hours == None and triggerDate == None
        self.seconds = seconds if seconds != None else 0
        self.minutes = minutes if minutes != None else 0
        self.hours = hours if hours != None else 0
        self.triggerDate = triggerDate
        self.customAPTrigger = customAPTrigger

class AsyncProcessor:
    """
    Async processor uses the `apscheduler` library to run functions asynchronously. Specific intervals can be set if needed as well.
    
    Manipulate the underling scheduler with the `scheduler` attribute.
    
    Sample Usage:
    ```python
    asyncProcessor = AsyncProcessor()
    
    def greet():
        print("Hi!")
    
    jobID = asyncProcessor.addJob(greet, trigger=Trigger(type='interval', seconds=5)) # This is all you need to add the job
    
    ## Pausing the scheduler
    asyncProcessor.pause()
    
    ## Resuming the scheduler
    asyncProcessor.resume()
    
    ## Shutting down the scheduler
    asyncProcessor.shutdown()
    
    ## To stop a job, use the jobID
    asyncProcessor.scheduler.remove_job(jobID) ## .pause_job() and .resume_job() can also be used to manipulate the job itself
    
    ## Disable logging with Logger
    asyncProcessor.logging = False
    ```
    
    For trigger options, see the `Trigger` class.
    """
    
    def __init__(self, paused=False, logging=True) -> None:
        self.id = uuid.uuid4().hex
        self.scheduler = BackgroundScheduler()
        self.scheduler.start(paused=paused)
        self.logging = logging
        
        self.log("Scheduler initialised in {} mode.".format("paused" if paused else "active"))
        
    def log(self, message):
        if self.logging == True:
            print("ASYNCPROCESSOR: {}: {}".format(self.id, message))
    
    def shutdown(self):
        self.scheduler.shutdown()
        self.log("Scheduler shutdown.")
    
    def pause(self):
        self.scheduler.pause()
        self.log("Scheduler paused.")
    
    def resume(self):
        self.scheduler.resume()
        self.log("Scheduler resumed.")
    
    def addJob(self, function, *args, trigger: Trigger=None, **kwargs):
        """
        Adds a job to the scheduler.
        """
        if trigger == None: trigger = Trigger()
        
        job = None
        if trigger.customAPTrigger != None:
            job = self.scheduler.add_job(function, trigger.customAPTrigger, args=args, kwargs=kwargs, misfire_grace_time=None)
            self.log("Job for '{}' added with custom trigger.".format(function.__name__))
        elif trigger.immediate:
            job = self.scheduler.add_job(function, args=args, kwargs=kwargs, misfire_grace_time=None)
            self.log("Job for '{}' added with immediate trigger.".format(function.__name__))
        elif trigger.type == "date":
            job = self.scheduler.add_job(function, DateTrigger(run_date=trigger.triggerDate), args=args, kwargs=kwargs, misfire_grace_time=None)
            self.log("Job for '{}' added with trigger date: {}.".format(function.__name__, trigger.triggerDate.isoformat()))
        else:
            job = self.scheduler.add_job(function, 'interval', seconds=trigger.seconds, minutes=trigger.minutes, hours=trigger.hours, args=args, kwargs=kwargs, misfire_grace_time=None)
            self.log("Job for '{}' added with trigger: {} seconds, {} minutes, {} hours.".format(function.__name__, trigger.seconds, trigger.minutes, trigger.hours))
            
        return job.id

class ThreadManager:
    '''Manage multiple `AsyncProcessor`s with this class.
    
    Spin up multiple processors and add jobs to them. Each processor spins up one or more separate threads and schedules jobs to run in the background.
    
    **Recommended Usage:**
    ```python
    import time
    from services import ThreadManager, AsyncProcessor, Trigger
    
    def sample_work(some_param):
        print(f"Working with {some_param}...")
        time.sleep(2)
        print(f"Done working with {some_param}!")
    
    ThreadManager.initDefault() # Initializes a default processor at `ThreadManager.defaultProcessor`
    id = ThreadManager.defaultProcessor.addJob(sample_work, "example_param", trigger=Trigger(type='interval', seconds=10)) # Adds a job to the default processor
    
    print(f"Job ID: {id}")
    ```
    
    **Advanced Usage with Multiple Processors (Caution):**
    ```python
    import time
    from services import ThreadManager, AsyncProcessor, Trigger
    
    # Spinning up a custom processor
    processor = ThreadManager.new(name="newScheduler", source="example.py") # Returns an `AsyncProcessor` instance. `name` must be unique.
    processor.addJob(lambda: print("Hello from the new thread!"), trigger=Trigger(type='interval', seconds=5))
    
    print("Current processors:", ThreadManager.list())
    print("Processor info:", ThreadManager.info("newThread"))

    time.sleep(10)
    
    processor2 = ThreadManager.getProcessorWithName("newScheduler") # Get the processor for the `newScheduler`
    processor2.addJob(lambda: print("This is another job in the same thread!"), trigger=Trigger(type='interval', seconds=10))
    
    time.sleep(25)

    ThreadManager.closeThread("newScheduler") # Close the processor
    # ThreadManager.shutdown() # Shutdown all processors
    ```
    
    Methods:
    - `list()`: Returns a list of all processor names.
    - `initDefault()`: Initializes a default processor named "default" and returns it.
    - `new(name: str, source: str, paused: bool=False, logging: bool=True)`: Creates a new processor with the given name and source. Returns an `AsyncProcessor` instance or an error message if the name is not unique.
    - `info(name: str)`: Returns information about the processor with the given name, including the processor, name, source, and creation time.
    - `getProcessorWithName(name: str)`: Returns the `AsyncProcessor` instance for the processor with the given name, or `None` if it does not exist.
    - `getProcessorWithID(id: str)`: Returns the `AsyncProcessor` instance for the processor with the given ID, or `None` if it does not exist.
    - `closeThread(name: str)`: Closes the processor with the given name and returns `True` if successful, or `False` if the processor does not exist.
    - `shutdown()`: Shuts down all threads and returns `True` if successful.
    
    Note: Be careful when using this class. It is very powerful and creates multiple real background threads. Close threads properly when no longer needed.
    '''
    
    data = {}
    defaultProcessor: AsyncProcessor | None = None
    
    @staticmethod
    def list() -> list[str]:
        '''Returns a list of all thread names managed by the ThreadManager.'''
        return list(ThreadManager.data.keys())
    
    @staticmethod
    def initDefault() -> AsyncProcessor:
        if "default" in ThreadManager.data:
            raise Exception("ERROR: Default thread already exists.")

        ThreadManager.defaultProcessor = ThreadManager.new(name="default", source="main.py")
        return ThreadManager.defaultProcessor
    
    @staticmethod
    def new(name: str, source: str, paused: bool=False, logging: bool=True) -> AsyncProcessor | str:
        '''Creates a new thread with the given name and source. Returns an `AsyncProcessor` instance or an error message if the name is not unique.'''
        if name in ThreadManager.data:
            return "ERROR: A thread with that name already exists. Name must be unique."
        
        processor = AsyncProcessor(paused=paused, logging=logging)
        ThreadManager.data[name] = {
            "processor": processor,
            "name": name,
            "source": source,
            "created": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        
        print("THREADMANAGER NEW: New thread with name '{}' created.".format(name))
        
        return processor

    @staticmethod
    def info(name: str) -> dict | None:
        '''Returns information about the thread with the given name, including the processor, name, source, and creation time. Returns `None` if the thread does not exist.'''
        return ThreadManager.data.get(name)
    
    @staticmethod
    def getProcessorWithName(name: str) -> AsyncProcessor | None:
        '''Returns the `AsyncProcessor` instance for the thread with the given name, or `None` if it does not exist.'''
        if name in ThreadManager.data:
            return ThreadManager.data[name]["processor"]
        else:
            return None
    
    @staticmethod
    def getProcessorWithID(id: str) -> AsyncProcessor | None:
        '''Returns the `AsyncProcessor` instance for the thread with the given ID, or `None` if it does not exist.'''
        for threadName in ThreadManager.list():
            if ThreadManager.data[threadName]["processor"].id == id:
                return ThreadManager.data[threadName]["processor"]
        return None
    
    @staticmethod
    def closeThread(name: str) -> bool:
        '''Closes the thread with the given name and returns `True` if successful, or `False` if the thread does not exist.'''
        processor = ThreadManager.getProcessorWithName(name)
        if processor == None:
            return False

        processor.shutdown()
        del ThreadManager.data[name]
        
        if name == "default":
            ThreadManager.defaultProcessor = None
        
        print("THREADMANAGER CLOSETHREAD: Thread '{}' closed successfully.".format(name))
        return True
    
    @staticmethod
    def shutdown() -> bool:
        '''Shuts down all threads and returns `True` if successful.'''
        for thread in ThreadManager.list():
            ThreadManager.closeThread(thread)
        
        ThreadManager.defaultProcessor = None
        
        print("THREADMANAGER SHUTDOWN: Shutdown complete.")
        return True