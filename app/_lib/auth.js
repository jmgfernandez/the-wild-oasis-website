import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createGuest, getGuest } from "./data-service";

const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  // 👇 ran if route matches route in middleware config(matcher)
  callbacks: {
    authorized({ auth, request }) {
      // trick to convert any value to Boolean
      return !!auth?.user;
    },
    // for connecting auth to DB
    // *The parameters are automatically passed to this signIn callback
    async signIn({ user, account, profile }) {
      try {
        const existingGuest = await getGuest(user.email);

        if (!existingGuest)
          await createGuest({ email: user.email, fullName: user.name });

        return true;
      } catch {
        return false;
      }
    },
    async session({ session, user }) {
      const guest = await getGuest(session.user.email);
      // mutating the session object(adding an Id property to its user object/property)
      // *It's done here because during signIn callback, session hasn't been created yet
      session.user.id = guest.id;
      return session;
    },
  },
  // To have custom pages for auth
  pages: {
    signIn: "/login",
  },
};

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth(authConfig);
