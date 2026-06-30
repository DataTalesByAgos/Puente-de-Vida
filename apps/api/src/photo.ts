import { z } from 'zod';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3 MB (binario)
const MAX_BASE64_LENGTH = Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 100; // overhead data:image/...;base64,

const MIME_PATTERN = ALLOWED_MIME_TYPES.map((m) => m.replace('/', '\\/')).join('|');

const dataUrlRegex = new RegExp(`^data:(${MIME_PATTERN});base64,[A-Za-z0-9+/]+=*$`);

export const photoUrlSchema = z
  .string()
  .max(
    MAX_BASE64_LENGTH,
    `La foto no debe superar los 3 MB (base64 ~${Math.round(MAX_BASE64_LENGTH / 1000)} caracteres)`,
  )
  .regex(dataUrlRegex, {
    message: `Formato inválido. Usá data:image/jpeg, image/png o image/webp;base64,...`,
  })
  .nullable()
  .optional();
