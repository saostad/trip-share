export const RECEIPT_IMAGE_MAX_SIDE = 1600;
export const RECEIPT_IMAGE_QUALITY = 0.85;

export interface ReceiptImageSize {
  width: number;
  height: number;
}

export interface ReceiptImage {
  mimeType: "image/jpeg";
  base64: string;
}

export const UNREADABLE_IMAGE_MESSAGE = "This image format can't be read in this browser.";

/**
 * Scales dimensions so the long side is at most `maxSide`, keeping the
 * aspect ratio. Smaller images pass through unchanged. Pure.
 */
export function targetSize(
  width: number,
  height: number,
  maxSide: number = RECEIPT_IMAGE_MAX_SIDE,
): ReceiptImageSize {
  if (!(width > 0) || !(height > 0) || !(maxSide > 0)) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function decodeError(): Error {
  return new Error(UNREADABLE_IMAGE_MESSAGE);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const comma = dataUrl.indexOf(",");
      resolve(comma === -1 ? "" : dataUrl.slice(comma + 1));
    };
    reader.onerror = () => reject(decodeError());
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts an uploaded receipt photo to a JPEG data payload: at most 1600px
 * on the long side, JPEG quality 0.85.
 */
export async function fileToReceiptImage(file: File): Promise<ReceiptImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw decodeError();
  }
  try {
    const { width, height } = targetSize(bitmap.width, bitmap.height);
    if (width === 0 || height === 0) {
      throw decodeError();
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw decodeError();
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", RECEIPT_IMAGE_QUALITY),
    );
    if (!blob) {
      throw decodeError();
    }
    return { mimeType: "image/jpeg", base64: await blobToBase64(blob) };
  } finally {
    bitmap.close();
  }
}
