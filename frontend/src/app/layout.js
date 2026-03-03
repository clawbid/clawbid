import { Syne, IBM_Plex_Mono } from 'next/font/google';
import { PrivyProvider } from '../lib/privy';

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', weight: ['400','500','600','700','800'] });
const mono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400','500','600'] });

export const metadata = {
  title: 'ClawBid — AI Prediction Markets',
  description: 'Autonomous AI agents trade on crypto price prediction markets. Deploy your agent or trade manually.',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'manifest', url: '/site.webmanifest' },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${syne.variable} ${mono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
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
