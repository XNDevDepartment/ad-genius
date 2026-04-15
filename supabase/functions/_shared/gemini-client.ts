/**
 * Shared Gemini API client for Supabase Edge Functions.
 *
 * Usage:
 *   import { createGeminiClient } from "../_shared/gemini-client.ts";
 *   const gemini = createGeminiClient(Deno.env.get("GOOGLE_AI_API_KEY")!);
 */

export const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

// ─── Model identifiers ────────────────────────────────────────────────────────
export const GEMINI_MODELS = {
  FLASH_IMAGE: "gemini-3.1-flash-image-preview",
  FLASH_TEXT: "gemini-2.5-flash",
  IMAGEN: "imagen-4.0-generate-001",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeminiInlineData {
  mimeType: string;
  data: string; // base64
}

export interface GeminiPart {
  text?: string;
  inlineData?: GeminiInlineData;
}

export interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

export interface GeminiImageConfig {
  aspectRatio?: string;
  imageSize?: string;
}

export interface GeminiGenerationConfig {
  responseModalities?: string[];
  imageConfig?: GeminiImageConfig;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
  finishMessage?: string;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

// ─── Imagen (predict) types ───────────────────────────────────────────────────

export interface ImagenInstance {
  prompt: string;
  image?: { bytesBase64Encoded: string };
  editInstruction?: string;
}

export interface ImagenParameters {
  sampleCount?: number;
  aspectRatio?: string;
  personGeneration?: string;
}

export interface ImagenResponse {
  predictions?: Array<{
    image: { imageBytes: string; mimeType?: string };
  }>;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class GeminiClient {
  constructor(private readonly apiKey: string) {}

  /**
   * POST /v1beta/models/{model}:generateContent
   * Returns the raw fetch Response so callers can handle streaming/errors themselves.
   */
  async generateContent(
    model: string,
    contents: GeminiContent[],
    generationConfig?: GeminiGenerationConfig,
    signal?: AbortSignal,
  ): Promise<Response> {
    return fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        ...(generationConfig ? { generationConfig } : {}),
      }),
      ...(signal ? { signal } : {}),
    });
  }

  /**
   * Convenience: generate content and parse JSON, with optional abort signal.
   * Throws on non-OK HTTP status.
   */
  async generateContentJSON(
    model: string,
    contents: GeminiContent[],
    generationConfig?: GeminiGenerationConfig,
    signal?: AbortSignal,
  ): Promise<GeminiResponse> {
    const res = await this.generateContent(model, contents, generationConfig, signal);
    if (!res.ok) {
      const text = await res.text();
      throw new GeminiAPIError(res.status, text);
    }
    return res.json() as Promise<GeminiResponse>;
  }

  /**
   * Convenience: generate content for a text-only model and return the text response.
   * Uses FLASH_TEXT model by default.
   */
  async generateText(
    prompt: string,
    inlineImage: GeminiInlineData,
    generationConfig?: GeminiGenerationConfig,
  ): Promise<string | null> {
    const contents: GeminiContent[] = [
      {
        parts: [
          { inlineData: inlineImage },
          { text: prompt },
        ],
      },
    ];
    const res = await this.generateContentJSON(
      GEMINI_MODELS.FLASH_TEXT,
      contents,
      generationConfig,
    );
    return extractText(res);
  }

  /**
   * POST /v1beta/models/{model}:predict  (Imagen API)
   * Returns the raw fetch Response.
   */
  async predict(
    model: string,
    instances: ImagenInstance[],
    parameters?: ImagenParameters,
  ): Promise<Response> {
    return fetch(`${GEMINI_BASE}/${model}:predict`, {
      method: "POST",
      headers: {
        "x-goog-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances,
        ...(parameters ? { parameters } : {}),
      }),
    });
  }
}

// ─── Response helpers ─────────────────────────────────────────────────────────

/** Extract the first base64-encoded image from a Gemini generateContent response. */
export function extractBase64Image(response: GeminiResponse): string | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find(
    (p) => p.inlineData?.mimeType?.startsWith("image/"),
  );
  return imgPart?.inlineData?.data ?? null;
}

/** Extract the first text value from a Gemini generateContent response. */
export function extractText(response: GeminiResponse): string | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const textPart = parts.find((p) => p.text);
  return textPart?.text ?? null;
}

/** Check whether the response was blocked by Gemini's image-safety filter. */
export function isImageSafetyBlock(response: GeminiResponse): boolean {
  return response.candidates?.[0]?.finishReason === "IMAGE_SAFETY";
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class GeminiAPIError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Gemini API error ${status}: ${body}`);
    this.name = "GeminiAPIError";
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createGeminiClient(apiKey: string): GeminiClient {
  return new GeminiClient(apiKey);
}
