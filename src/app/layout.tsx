import type { Metadata } from 'next';
import './globals.css';
import { SyntheticDataBanner } from '@/components/ui/Banner';
import { HealthStrip } from '@/components/ui/HealthStrip';
import { Navbar } from '@/components/ui/Navbar';
import { auth } from '@/auth';

export const metadata: Metadata = {
  title: 'IncidentComms AI | Security Incident Communication Platform',
  description: 'Evidence-grounded, multi-audience incident communications platform with cryptographic trust and human-in-the-loop governance.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased min-h-screen flex flex-col">
        <SyntheticDataBanner />
        <HealthStrip />
        <Navbar currentUser={session?.user} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
