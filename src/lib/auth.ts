import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
          tier: user.tier,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.tier = user.tier;
      }

      if (trigger === "update" && session) {
        const patch = session as { tier?: string; user?: { tier?: string } };
        if (patch.tier) token.tier = patch.tier;
        if (patch.user?.tier) token.tier = patch.user.tier;
      }

      // Keep JWT tier in sync with DB (promo redeem + refresh)
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tier: true },
        });
        if (dbUser?.tier) token.tier = dbUser.tier;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id?: string; tier?: string }).id =
          token.id as string;
        (session.user as { id?: string; tier?: string }).tier =
          token.tier as string;
      }
      return session;
    },
  },
};
