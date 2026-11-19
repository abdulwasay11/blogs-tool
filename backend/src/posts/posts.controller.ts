import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UpsertPostDto } from './post.dto';
import { PostsService } from './posts.service';

/** Public, read-only: what the blog site shows. */
@Controller('public/posts')
export class PublicPostsController {
  constructor(private posts: PostsService) {}
  @Get() list() { return this.posts.publicList(); }
  @Get(':slug') one(@Param('slug') slug: string) { return this.posts.publicBySlug(slug); }
}

/** Admin: open for local use. */
@Controller('posts')
export class PostsController {
  constructor(private posts: PostsService) {}
  @Get() list(@Query('q') q?: string, @Query('status') status?: string) { return this.posts.list(q, status); }
  @Get(':id') one(@Param('id') id: string) { return this.posts.get(id); }
  @Post() create(@Body() dto: UpsertPostDto) { return this.posts.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpsertPostDto) { return this.posts.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.posts.remove(id); }
}
