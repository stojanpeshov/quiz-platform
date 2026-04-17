import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { getServiceClient } from "./supabase";

const REQUIRED_TENANT = process.env.AZURE_AD_TENANT_ID!;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: REQUIRED_TENANT,
      authorization: { params: { scope: "openid profile email User.Read" } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * STRICT TENANT LOCK
     * Reject any token whose tid doesn't match our tenant.
     * Also reject if oid or email is missing.
     */
    async signIn({ profile, account }) {
      if (account?.provider !== "azure-ad") return false;
      const tid = (profile as any)?.tid;
      const oid = (profile as any)?.oid;
      const email = (profile as any)?.email ?? (profile as any)?.preferred_username;
      if (tid !== REQUIRED_TENANT) return false;
      if (!oid || !email) return false;
      return true;
    },

    /**
     * Upsert the user in our DB and attach internal id + role to the JWT.
     * These claims drive all RLS policies.
     */
    async jwt({ token, profile, account }) {
      if (account && profile) {
        const oid = (profile as any).oid as string;
        const email = ((profile as any).email ?? (profile as any).preferred_username) as string;
        const name = (profile as any).name as string;
        const svc = getServiceClient();
        // Upsert by azure_oid (stable identifier from Entra)
        const { data, error } = await svc
          .from("users")
          .upsert(
            { azure_oid: oid, email, name, last_login_at: new Date().toISOString() },
            { onConflict: "azure_oid" }
          )
          .select("id, role")
          .single();
        if (error || !data) throw new Error("Failed to upsert user");
        token.user_id = data.id;
        token.role = data.role;
        token.email = email;
        token.name = name;
      }
      return token;
    },

    async session({ session, token }) {
      (session.user as any).id = token.user_id;
      (session.user as any).role = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
