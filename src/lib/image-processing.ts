import "server-only";
import sharp from "sharp";

/**
 * Safeguarding requirement: every uploaded image is stripped of EXIF
 * (including GPS) and capped at 800px on the long edge before storage.
 * sharp does not copy metadata by default unless `.withMetadata()` is
 * called, so simply not calling it guarantees a clean output.
 */
export async function processImage(input: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  const image = sharp(input).rotate(); // apply EXIF orientation, then metadata is dropped below
  const resized = image.resize({
    width: 800,
    height: 800,
    fit: "inside",
    withoutEnlargement: true,
  });

  const buffer = await resized.webp({ quality: 85 }).toBuffer();
  const meta = await sharp(buffer).metadata();

  return { buffer, width: meta.width ?? 0, height: meta.height ?? 0 };
}
