import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { StrapiAuthResponse } from "@/app/lib/definitions";

async function strapiAuth(email: string, password: string): Promise<StrapiAuthResponse | undefined> {
  try {
    const url = `${process.env.STRAPI_URL}/api/auth/local`;

    try {
      const response: any = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier: email, password: password }),
        cache: "no-cache",
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch user:", error);
      throw new Error("Failed to fetch user.");
    }
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await strapiAuth(email, password);
          if (!user) return null;
        }
      },
    }),
  ],
});
