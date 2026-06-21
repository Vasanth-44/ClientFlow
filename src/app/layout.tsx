import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { DashboardLayout } from '@/components/DashboardLayout';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ClientFlow AI — CRM, Project & Payment SaaS',
  description: 'Manage leads, clients, projects, tasks, payments, and generate invoices with PDF exports and AI-powered copy tools.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full font-sans bg-white text-slate-900 dark:bg-black dark:text-slate-50">
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <DashboardLayout>{children}</DashboardLayout>
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
