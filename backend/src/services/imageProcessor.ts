import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 80;
const PNG_QUALITY = 80;

/**
 * Komprimerar och skalar ner en uppladdad bild.
 * Skriver över originalfilen med den optimerade versionen.
 * PNG-filer konverteras till JPEG för bättre komprimering.
 */
export async function processImage(filePath: string): Promise<{ originalSize: number; newSize: number; saved: number }> {
  const originalStats = await fs.stat(filePath);
  const originalSize = originalStats.size;
  const ext = path.extname(filePath).toLowerCase();

  const tempPath = filePath + '.tmp';

  const image = sharp(filePath).rotate(); // .rotate() auto-roterar baserat på EXIF

  const metadata = await image.metadata();
  const needsResize = metadata.width && metadata.width > MAX_WIDTH;

  let pipeline = needsResize
    ? image.resize(MAX_WIDTH, undefined, { withoutEnlargement: true })
    : image;

  if (ext === '.png') {
    // Konvertera PNG till JPEG (mycket bättre storlek för foton)
    const jpegPath = filePath.replace(/\.png$/i, '.jpeg');
    await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(jpegPath);
    // Ta bort original-PNG
    await fs.unlink(filePath);
    const newStats = await fs.stat(jpegPath);
    return { originalSize, newSize: newStats.size, saved: originalSize - newStats.size };
  }

  // JPEG/WebP - komprimera på plats
  if (ext === '.webp') {
    await pipeline.webp({ quality: JPEG_QUALITY }).toFile(tempPath);
  } else {
    await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(tempPath);
  }

  await fs.rename(tempPath, filePath);
  const newStats = await fs.stat(filePath);
  return { originalSize, newSize: newStats.size, saved: originalSize - newStats.size };
}

/**
 * Bearbetar flera uppladdade filer.
 * Returnerar info om filer vars namn ändrades (PNG → JPEG).
 */
export async function processUploadedImages(files: Express.Multer.File[]): Promise<Map<string, string>> {
  const renamedFiles = new Map<string, string>(); // old filename → new filename

  for (const file of files) {
    try {
      const result = await processImage(file.path);
      const savedKB = Math.round(result.saved / 1024);
      const newSizeKB = Math.round(result.newSize / 1024);
      console.log(`📷 Bild optimerad: ${file.originalname} (${newSizeKB}KB, sparade ${savedKB}KB)`);

      // Om PNG konverterades till JPEG, spara den nya filnamnet
      if (path.extname(file.filename).toLowerCase() === '.png') {
        const newFilename = file.filename.replace(/\.png$/i, '.jpeg');
        renamedFiles.set(file.filename, newFilename);
      }
    } catch (error) {
      console.error(`Kunde inte optimera bild ${file.originalname}:`, error);
      // Behåll originalfilen om optimering misslyckas
    }
  }

  return renamedFiles;
}
