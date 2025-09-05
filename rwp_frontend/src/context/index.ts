// src/context/index.ts
interface Context {
    lastLogin: string | null;
    setLastLogin: (id: string | null) => void;
  }
  
  export const context: Context = {
    lastLogin: null,
    setLastLogin(id: string | null) {
      this.lastLogin = id;
    },
  };
  