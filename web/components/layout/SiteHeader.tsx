'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/auth', label: 'Create account' },
  { href: '/pricing', label: 'Plans' },
]

export default function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="site-header">
      <Link href="/" className="logo-mark">
        <Image src="/youlogo.png" alt="YouFirst logo" width={48} height={48} priority />
      </Link>
      <nav className="site-nav main-nav">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className={`nav-link ${pathname === link.href ? 'nav-link--active' : ''}`}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="site-actions">
        <Link href="/auth" className="btn btn-ghost btn-compact">
          Sign in
        </Link>
        <Link href="/pricing" className="btn btn-primary btn-compact">
          Start membership
        </Link>
      </div>
    </header>
  )
}

