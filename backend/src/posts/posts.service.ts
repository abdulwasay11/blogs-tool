import { Injectable, NotFoundException } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { UpsertPostDto } from './post.dto';

type PostRecord = {
  _id: string;
  title: string;
  slug: string;
  html: string;
  excerpt: string;
  categories: string[];
  featuredImage: string;
  status: string;
  visibility: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const slugify = (value: string) =>
  value.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
const cleanHtml = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'font', 'strike', 'del']),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      font: ['face', 'size', 'color'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      '*': ['id', 'style'],
    },
    allowedSchemesByTag: { img: ['http', 'https'] },
  });
const toText = (html: string) =>
  sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim().slice(0, 180);

@Injectable()
export class PostsService {
  private readonly dir = join(process.cwd(), 'data');
  private readonly file = join(this.dir, 'posts.json');

  constructor() {
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
    if (!existsSync(this.file)) writeFileSync(this.file, '[]', 'utf8');
  }

  private read(): PostRecord[] {
    try { return JSON.parse(readFileSync(this.file, 'utf8')); }
    catch { return []; }
  }

  private write(posts: PostRecord[]) {
    writeFileSync(this.file, JSON.stringify(posts, null, 2), 'utf8');
  }

  private fields(dto: UpsertPostDto, existing?: PostRecord) {
    const now = new Date().toISOString();
    const fields: Partial<PostRecord> = { updatedAt: now };
    if (dto.title !== undefined) fields.title = dto.title.trim() || 'Untitled';
    if (dto.html !== undefined) {
      fields.html = cleanHtml(dto.html);
      fields.excerpt = toText(fields.html);
    }
    if (dto.categories) fields.categories = [...new Set(dto.categories.map((category) => category.trim()).filter(Boolean))];
    if (dto.featuredImage !== undefined) fields.featuredImage = /^https?:\/\//.test(dto.featuredImage) ? dto.featuredImage : '';
    if (dto.status) fields.status = dto.status;
    if (dto.visibility) fields.visibility = dto.visibility;
    if (dto.status === 'published' && !existing?.publishedAt) fields.publishedAt = now;
    return fields;
  }

  private uniqueSlug(base: string, exceptId?: string) {
    const posts = this.read();
    const root = slugify(base) || 'post';
    let candidate = root;
    let number = 1;
    while (posts.some((post) => post._id !== exceptId && post.slug === candidate)) candidate = `${root}-${++number}`;
    return candidate;
  }

  list(q?: string, status?: string) {
    let posts = this.read();
    if (status) posts = posts.filter((post) => post.status === status);
    if (q) {
      const query = q.toLowerCase();
      posts = posts.filter((post) =>
        post.title.toLowerCase().includes(query) || post.categories.some((category) => category.toLowerCase().includes(query)));
    }
    return posts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(({ html, ...post }) => post);
  }

  async get(id: string) {
    const post = this.read().find((item) => item._id === id);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(dto: UpsertPostDto) {
    const now = new Date().toISOString();
    const fields = this.fields(dto);
    const post: PostRecord = {
      _id: randomUUID(),
      title: fields.title || 'Untitled',
      slug: this.uniqueSlug(dto.slug || fields.title || 'post'),
      html: fields.html || '',
      excerpt: fields.excerpt || '',
      categories: fields.categories || [],
      featuredImage: fields.featuredImage || '',
      status: fields.status || 'draft',
      visibility: fields.visibility || 'public',
      publishedAt: fields.publishedAt,
      createdAt: now,
      updatedAt: now,
    };
    const posts = this.read();
    posts.push(post);
    this.write(posts);
    return post;
  }

  async update(id: string, dto: UpsertPostDto) {
    const posts = this.read();
    const index = posts.findIndex((post) => post._id === id);
    if (index === -1) throw new NotFoundException('Post not found');
    const existing = posts[index];
    const fields = this.fields(dto, existing);
    const updated = {
      ...existing,
      ...fields,
      ...(dto.slug !== undefined ? { slug: this.uniqueSlug(dto.slug || fields.title || existing.title, id) } : {}),
    };
    posts[index] = updated;
    this.write(posts);
    return updated;
  }

  async remove(id: string) {
    const posts = this.read();
    if (!posts.some((post) => post._id === id)) throw new NotFoundException('Post not found');
    this.write(posts.filter((post) => post._id !== id));
    return { ok: true };
  }

  publicList() {
    return this.read()
      .filter((post) => post.status === 'published' && post.visibility === 'public')
      .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt))
      .map(({ html, ...post }) => post);
  }

  async publicBySlug(slug: string) {
    const post = this.read().find((item) => item.slug === slug && item.status === 'published' && item.visibility === 'public');
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }
}
