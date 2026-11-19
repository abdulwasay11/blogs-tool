import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { publicGet } from '@/lib/api';

export const dynamic = 'force-dynamic';
const fmt = (t: string) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function Home() {
  let posts: any[] = [];
  let err = '';
  try { posts = await publicGet('/public/posts'); } catch { err = 'The API is not reachable. Start the NestJS server and refresh.'; }
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <h1 className="pg">Latest writing</h1>
        <p className="sub">Published posts, newest first.</p>
        {err && <div className="empty">{err}</div>}
        {!err && !posts.length && <div className="empty">No published posts yet. Open the admin, write one and press Publish.</div>}
        <div className="entries">
          {posts.map((p) => (
            <Link key={p._id} href={`/blog/${p.slug}`} className="entry">
              <div>
                <h2>{p.title}</h2>
                <p>{p.excerpt}</p>
                <small>{fmt(p.publishedAt || p.createdAt)}{p.categories?.length ? ' / ' + p.categories.join(', ') : ''}</small>
              </div>
              {p.featuredImage && <img src={p.featuredImage} alt="" />}
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
