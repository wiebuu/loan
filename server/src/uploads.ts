import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from './config.js';
import { badRequest } from './errors.js';

/** Recognise the file from its first bytes, not from what the client claims it is. */
function imageType(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

/**
 * Save a base64 receipt photo and return the path it's served at.
 * The file name is 128 random bits, so the link can't be guessed.
 */
export async function saveReceiptImage(base64: string): Promise<string> {
  const data = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
  if (data.length === 0) throw badRequest('The receipt photo is empty');
  if (data.length > config.maxReceiptBytes) throw badRequest('That photo is too big. Pick one under 5 MB');
  const ext = imageType(data);
  if (!ext) throw badRequest('The receipt must be a JPEG, PNG or WebP photo');

  await mkdir(config.uploadsDir, { recursive: true });
  const name = `${randomBytes(16).toString('hex')}.${ext}`;
  await writeFile(join(config.uploadsDir, name), data);
  return `/uploads/${name}`;
}
