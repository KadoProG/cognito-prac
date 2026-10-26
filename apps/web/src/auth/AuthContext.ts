import { createContext } from "react";

import type { User } from "../lib/api.ts";

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" };

export type AuthContextValue = {
  state: AuthState;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  updateName(name: string): Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
