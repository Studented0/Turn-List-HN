import type { Metadata } from 'next'
import './globals.css'
import { DarkModeToggle } from '@/components/DarkModeToggle'

export const metadata: Metadata = {
  title: 'CadenApp',
  description: 'Weight tracking leaderboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
        <header className="border-b border-black dark:border-white">
          <nav className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-6">
            <a href="/" className="text-sm hover:underline">
              Đặt Vào Trong
            </a>
            <a href="/leaderboard" className="text-sm hover:underline">
              Danh Sách Lượt
            </a>
            <a href="/admin" className="text-sm hover:underline">
              Admin
            </a>
            <a href="/remote-control" className="text-sm hover:underline">
              Remote
            </a>
            <div className="ml-auto">
              <DarkModeToggle />
            </div>
          </nav>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-10">{children}</main>
      </body>
    </html>
  )
}
