import './globals.css'
import { Providers } from '../components/Providers'
import Navbar from '../components/Navbar'
import AppLoader from '../components/AppLoader'

export const metadata = {
  title: 'Prysm',
  description: 'A GitHub-inspired workspace for creating, versioning, and improving AI prompts.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark_default" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('prysm_theme') || localStorage.getItem('prompthub_theme') || 'dark_default';
                  var isDark = t.indexOf('dark') !== -1;
                  document.documentElement.setAttribute('data-theme', t);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch(e) {
                  document.documentElement.setAttribute('data-theme', 'dark_default');
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <Providers>
          <AppLoader />
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
