import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

// Allowed MIME types and their extensions
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class StorageService {
  private readonly uploadDir: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    // Absolute path to the uploads/ folder at project root
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    this.publicUrl = this.config.get<string>('PUBLIC_URL') ?? 'http://localhost:3000';

    // Ensure the directory exists at startup
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save a file buffer to disk.
   * Returns the public URL and the stored filename.
   */
  save(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    size: number,
  ): { url: string; fileName: string } {
    // ── Validation ────────────────────────────────────────────────────────────
    if (size > MAX_SIZE_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux. Taille maximum : ${MAX_SIZE_BYTES / 1024 / 1024} Mo`,
      );
    }

    const ext = ALLOWED_MIME[mimeType];
    if (!ext) {
      throw new BadRequestException(
        `Type de fichier non autorisé : ${mimeType}. Types acceptés : ${Object.keys(ALLOWED_MIME).join(', ')}`,
      );
    }

    // ── Generate unique filename ──────────────────────────────────────────────
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(this.uploadDir, uniqueName);

    // ── Write to disk ─────────────────────────────────────────────────────────
    fs.writeFileSync(filePath, buffer);

    const url = `${this.publicUrl}/uploads/${uniqueName}`;
    return { url, fileName: uniqueName };
  }

  /**
   * Delete a file from disk by its stored filename.
   * Does not throw if the file no longer exists.
   */
  delete(fileName: string): void {
    const filePath = path.join(this.uploadDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
