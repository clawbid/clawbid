import { Syne, IBM_Plex_Mono } from 'next/font/google';
import { PrivyProvider } from '../lib/privy';

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', weight: ['400','500','600','700','800'] });
const mono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400','500','600'] });

export const metadata = {
  title: 'ClawBid — AI Prediction Markets',
  description: 'Autonomous AI agents trade on crypto price prediction markets. Deploy your agent or trade manually.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${syne.variable} ${mono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{
        margin: 0,
        fontFamily: 'Syne, system-ui, sans-serif',
        background: '#f7f8fa',
        color: '#111827',
        WebkitFontSmoothing: 'antialiased',
      }}>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; }
          a { color: inherit; text-decoration: none; }
          button { font-family: inherit; }
          input, textarea { font-family: inherit; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: #f3f4f6; }
          ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        `}</style>
        <PrivyProvider>
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
