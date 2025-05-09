import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extend the built-in session types
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  /**
   * Extend the built-in user types
   */
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    username?: string | null;
  }
}

declare module "next-auth/jwt" {
  /** Extend the built-in JWT types */
  interface JWT {
    id: string;
    username?: string | null;
  }
}