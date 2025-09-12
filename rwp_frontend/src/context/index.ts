// src/context/index.ts

interface Context {
  lastLogin: string | null;
  setLastLogin: (id: string | null) => void;

  initialPath: {
    pathname: string;
    search: string;
    hash: string;
  };

  sessionId: string | null;
  setSessionId: (id: string | null) => void;

  uiRenderPromise: Promise<void> | null;
  setUiRenderPromise: (p: Promise<void> | null) => void;
}

export const context: Context = {
  lastLogin: null,
  setLastLogin(id: string | null) {
    this.lastLogin = id;
  },

  initialPath: {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  },

  sessionId: null,
  setSessionId(id: string | null) {
    this.sessionId = id;
  },

  uiRenderPromise: null,
  setUiRenderPromise(p: Promise<void> | null) {
    this.uiRenderPromise = p;
  },
};
