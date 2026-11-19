import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { publicGet } from '@/lib/api';

export const dynamic = 'force-dynamic';
const fmt = (t: string) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const p = await publicGet(`/public/posts/${params.slug}`);
    return { title: p.title, description: p.excerpt };
  } catch { return { title: 'Not found' }; }
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  let post: any;
  try { post = await publicGet(`/public/posts/${params.slug}`); } catch { notFound(); }
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <article className="article">
          <h1 className="t">{post.title}</h1>
          <div className="meta">{fmt(post.publishedAt || post.createdAt)}{post.categories?.length ? ' / ' + post.categories.join(', ') : ''}</div>
          {post.featuredImage && <img className="hero" src={post.featuredImage} alt="" />}
          {/* HTML is sanitised by the API before it is stored */}
          <div className="doc" dangerouslySetInnerHTML={{ __html: post.html }} />
        </article>
      </main>
    </>
  );
}
