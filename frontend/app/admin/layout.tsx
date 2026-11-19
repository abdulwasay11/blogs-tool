'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className="top">
        <div className="in">
          <Link href="/" className="brand">Pressroom<span>.</span></Link>
          <nav>
            <Link className="nb" href="/admin" aria-current={path === '/admin' ? 'true' : undefined}>Posts</Link>
            <Link className="nb" href="/" target="_blank">View site</Link>
          </nav>
          <Link className="btn pri" href="/admin/new">New post</Link>
        </div>
      </header>
      {children}
    </>
  );
}
