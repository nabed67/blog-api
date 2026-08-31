export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MIME_WHITELIST = [...IMAGE_MIME_TYPES] as const;
export type AllowedMimeType = (typeof MIME_WHITELIST)[number];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export const IMAGE_MAX_WIDTH = 1920;
export const IMAGE_MAX_HEIGHT = 1080;
export const IMAGE_WEBP_QUALITY = 85;

/**
 * Binary signatures used to verify actual file content matches claimed MIME type.
 * Each entry is an array of valid patterns; a match on any pattern passes.
 * offset defaults to 0 when omitted.
 */
export const MAGIC_BYTES: Record<
  AllowedMimeType,
  { bytes: number[]; offset?: number }[]
> = {
  'image/jpeg': [{ bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/webp': [{ bytes: [0x52, 0x49, 0x46, 0x46] }],
};

/** Extra WebP check: bytes 8–11 must be 'WEBP' */
export const WEBP_SECONDARY_BYTES = {
  bytes: [0x57, 0x45, 0x42, 0x50], // 'WEBP'
  offset: 8,
};

/** How many header bytes to read for magic byte validation */
export const MAGIC_BYTE_HEADER_LENGTH = 16;
