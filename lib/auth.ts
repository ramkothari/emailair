import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getUserByEmail, upsertAuthenticatedUser } from "@/lib/users/user-service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.modify",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      const email =
        typeof user?.email === "string"
          ? user.email
          : typeof token.email === "string"
            ? token.email
            : null;

      if (account?.provider === "google" && email) {
        const persistedUser = await upsertAuthenticatedUser({
          email,
          name:
            typeof user?.name === "string"
              ? user.name
              : typeof token.name === "string"
                ? token.name
                : null,
          image:
            typeof user?.image === "string"
              ? user.image
              : typeof token.picture === "string"
                ? token.picture
                : null,
          googleId:
            typeof account.providerAccountId === "string"
              ? account.providerAccountId
              : null,
        });

        token.userId = persistedUser.id;
        token.email = persistedUser.email;
        token.name = persistedUser.name;
        token.picture = persistedUser.image;
        token.googleId = persistedUser.googleId;
      } else if (!token.userId && email) {
        const persistedUser = await getUserByEmail(email);

        if (persistedUser) {
          token.userId = persistedUser.id;
          token.email = persistedUser.email;
          token.name = persistedUser.name;
          token.picture = persistedUser.image;
          token.googleId = persistedUser.googleId;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.accessToken =
        typeof token.accessToken === "string" ? token.accessToken : undefined;

      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return baseUrl;
    },
  },
});
