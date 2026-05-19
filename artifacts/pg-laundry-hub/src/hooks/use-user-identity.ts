import { useState, useEffect } from "react";

export interface UserIdentity {
  name: string;
  room: string;
}

const STORAGE_KEY = "pg_laundry_user";

export function useUserIdentity() {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse user identity", e);
      }
    }
    setIsLoading(false);
  }, []);

  const saveUser = (identity: UserIdentity) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    setUser(identity);
  };

  return { user, saveUser, isLoading };
}
