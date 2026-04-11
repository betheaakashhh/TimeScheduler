// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', newUser: '/onboarding', error: '/login' },
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email.toLowerCase() } });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name || undefined, image: user.avatarUrl || undefined };
      },
    }),
  ],
  callbacks: {
    // Ensure id is always written into the JWT token
    async jwt({ token, user, account }) {
      if (user) {
        token.id  = user.id;
        token.sub = user.id; // keep sub in sync too
      }
      // For OAuth, look up user in DB to get their internal id
      if (account && account.type !== 'credentials' && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email as string }, select: { id: true } });
        if (dbUser) { token.id = dbUser.id; token.sub = dbUser.id; }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) (session.user as any).id = token.id as string;
      else if (token?.sub) (session.user as any).id = token.sub as string;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await prisma.streak.create({ data: { userId: user.id!, current: 0, best: 0 } }).catch(() => {});
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
