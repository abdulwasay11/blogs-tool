import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomBytes } from 'crypto';
import { diskStorage } from 'multer';

// Extension comes from the checked mimetype, never from the client's file name.
const EXT: Record<string, string> = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/avif': '.avif',
};

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${randomBytes(4).toString('hex')}${EXT[file.mimetype]}`),
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        EXT[file.mimetype] ? cb(null, true) : cb(new BadRequestException('Only PNG, JPEG, GIF, WebP or AVIF images'), false),
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file received');
    const publicApiUrl = (process.env.PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
    return { url: `${publicApiUrl}/uploads/${file.filename}` };
  }
}
