'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const fmt = (t: string) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminPosts() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [f, setF] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { api('/posts').then(setPosts).catch((e) => setErr(e.message)); }, []);
  const all = posts || [];
  const rows = all.filter((p) => (!f || p.status === f) && (p.title.toLowerCase().includes(q.toLowerCase()) || (p.categories || []).join(' ').toLowerCase().includes(q.toLowerCase())));

  return (
    <main className="wrap">
      <h1 className="pg">Posts</h1>
      <p className="sub">Everything you’ve written, stored locally.</p>
      <div className="stats">
        <div><b>{all.length}</b><span>Total</span></div>
        <div><b>{all.filter((p) => p.status === 'published').length}</b><span>Published</span></div>
        <div><b>{all.filter((p) => p.status !== 'published').length}</b><span>Drafts</span></div>
      </div>
      <div className="tools">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or category" aria-label="Search posts" />
        <select value={f} onChange={(e) => setF(e.target.value)} aria-label="Status">
          <option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option>
        </select>
      </div>
      {err && <div className="empty">{err}</div>}
      {!err && rows.length === 0 && <div className="empty">{all.length ? 'No posts match your search.' : 'No posts yet. Start a new post, or paste a blog you wrote with Claude and let Pressroom split it into title, headings and paragraphs.'}</div>}
      {rows.length > 0 && (
        <table className="pl">
          <thead><tr><th>Post title</th><th>Status</th><th className="hide-s">Categories</th><th>Updated</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p._id} className="r" tabIndex={0} onClick={() => router.push(`/admin/${p._id}`)} onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/${p._id}`)}>
                <td className="tt">{p.title}</td>
                <td><span className={'badge ' + (p.status === 'published' ? 'pub' : '')}>{p.status === 'published' ? 'Published' : 'Draft'}</span></td>
                <td className="hide-s">{(p.categories || []).join(', ')}</td>
                <td>{fmt(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
