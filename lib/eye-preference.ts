import { EYE_VARIANTS, EyeVariant } from "../components/sheep-sprite";

export function isEyeVariant(value: unknown): value is EyeVariant {
  return EYE_VARIANTS.includes(value as EyeVariant);
}

export function eyeVariantFromMetadata(
  metadata: Record<string, unknown> | undefined,
): EyeVariant {
  const saved = metadata?.eye_variant;
  return isEyeVariant(saved) ? saved : EYE_VARIANTS[0];
}
