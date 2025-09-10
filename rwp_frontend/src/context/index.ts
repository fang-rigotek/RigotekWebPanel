// src/context/index.ts
export interface UserToken {
  token: string;
  expiresAt: number;
}

export interface DeviceToken {
  token: string;
  expiresAt: number;
}


interface Context {
  lastLogin: string | null;
  setLastLogin: (id: string | null) => void;

  initialPath: string;

  sessionId: string | null;
  setSessionId: (id: string | null) => void;
}

export const context: Context = {
  lastLogin: null,
  setLastLogin(id: string | null) {
    this.lastLogin = id;
  },

  initialPath:
    window.location.pathname +
    window.location.search +
    window.location.hash,

  sessionId: null,
  setSessionId(id: string | null) {
    this.sessionId = id;
  },
};
