import './globals.css'
import { Providers } from '../components/Providers'
import Navbar from '../components/Navbar'

export const metadata = {
  title: 'PromptHub - Version. Improve. Ship better prompts.',
  description: 'A GitHub-inspired workspace for creating, versioning, and improving AI prompts.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
