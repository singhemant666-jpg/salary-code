import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MPCG Payroll System',
  description: 'My Pain Clinic Global — Employee Payroll & Salary Slip Management',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
