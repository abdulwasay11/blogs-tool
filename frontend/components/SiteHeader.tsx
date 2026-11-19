import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="top">
      <div className="in">
        <Link href="/" className="brand">Pressroom<span>.</span></Link>
        <nav><Link className="nb" href="/" aria-current="true">Blog</Link></nav>
        <Link className="btn pri" href="/admin">Write</Link>
      </div>
    </header>
  );
}
