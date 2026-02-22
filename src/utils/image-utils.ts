import * as ImageManipulator from "expo-image-manipulator";
import { logger } from "./logger";

/**
 * Compress a local image and return it as a Base64 Data URI string.
 *
 * The image is resized to max 800px width and JPEG-compressed at 50% quality,
 * keeping the result well under Firestore's 1 MB document limit.
 *
 * @param localUri - A local `file://` URI (e.g. from expo-image-picker).
 * @returns A `data:image/jpeg;base64,...` string, or `null` if processing fails.
 */
export async function compressImageToBase64(
  localUri: string,
): Promise<string | null> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 800 } }],
      {
        compress: 0.5,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );

    if (result.base64) {
      return `data:image/jpeg;base64,${result.base64}`;
    }

    logger.warn("[ImageUtils] manipulateAsync returned no base64 data");
    return null;
  } catch (error) {
    logger.error("[ImageUtils] Failed to compress image:", error);
    return null;
  }
}
