// @ts-ignore
import '../styles/globals.css';
import React from 'react';

export const metadata = {
  title: 'Eco Vijay — Admin',
  description: 'Admin panel for Eco Vijay Growth',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

