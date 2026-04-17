import "./globals.css";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Quiz Platform",
  description: "Internal quiz platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SessionProvider session={session}>
          {session && <NavBar session={session} />}
          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
