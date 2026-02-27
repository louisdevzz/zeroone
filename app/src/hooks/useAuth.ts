"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession, saveSession } from "@/lib/auth";
import { api, type User } from "@/lib/api-client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    api.auth.me(session.token)
      .then((u) => {
        setUser(u);
        saveSession(session.token, u);
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    clearSession();
    setUser(null);
    router.push("/login");
  };

  return { user, loading, setUser, logout };
}
