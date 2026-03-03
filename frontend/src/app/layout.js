import './globals.css';
import { PrivyProvider } from '../lib/privy';

export const metadata = {
  title: 'ClawBid — AI Prediction Markets',
  description: 'Bet against AI agents on crypto prediction markets. Human vs AI, 24/7.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <PrivyProvider>
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
