export interface AuthCredentials {
  username: string;
  keyphrase: string;
}

export const getAuthCredentials = async (): Promise<AuthCredentials | null> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(['username', 'keyphrase'], (result: any) => {
      if (result.username && result.keyphrase) {
        resolve({
          username: result.username as string,
          keyphrase: result.keyphrase as string,
        });
      } else {
        resolve(null);
      }
    });
  });
};

export const setAuthCredentials = async (credentials: AuthCredentials): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        username: credentials.username,
        keyphrase: credentials.keyphrase,
      },
      () => {
        resolve();
      }
    );
  });
};

export const clearAuthCredentials = async (): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['username', 'keyphrase', 'lastOpenedJournalId'], () => {
      resolve();
    });
  });
};

export const getLastOpenedJournalId = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lastOpenedJournalId'], (result: any) => {
      resolve((result.lastOpenedJournalId as string) || null);
    });
  });
};

export const setLastOpenedJournalId = async (journalId: string): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ lastOpenedJournalId: journalId }, () => {
      resolve();
    });
  });
};
