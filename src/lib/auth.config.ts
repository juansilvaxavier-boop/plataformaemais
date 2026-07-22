import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Configuração "leve", segura para o Edge Runtime: usada pelo middleware.
// Não importa Prisma, bcrypt nem provedores OAuth — isso mantém o bundle do
// middleware dentro do limite de tamanho de Edge Function da Vercel (1 MB).
// A autenticação de fato (Credentials + Prisma) mora em src/lib/auth.ts,
// que roda em Node.js (rotas de API, Server Components, Server Actions).
export const authConfig: NextAuthConfig = {
  // Necessário atrás de um proxy/CDN (Vercel, Netlify, etc.): sem isso o
  // Auth.js v5 rejeita o Host header recebido e retorna a página genérica
  // de "Configuration error".
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
};
