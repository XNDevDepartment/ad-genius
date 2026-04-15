/**
 * Shared OpenAI API client for Supabase Edge Functions.
 *
 * Covers:
 *   - Assistants API v2  (threads, messages, runs, files)
 *   - Images API         (generations, edits)
 *
 * Usage:
 *   import { createOpenAIClient } from "../_shared/openai-client.ts";
 *   const openai = createOpenAIClient(Deno.env.get("OPENAI_API_KEY")!);
 */

export const OPENAI_BASE = "https://api.openai.com/v1";

/** Header required for the Assistants v2 beta. */
export const ASSISTANTS_BETA_HEADER = { "OpenAI-Beta": "assistants=v2" };

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageContentItem =
  | { type: "text"; text: string }
  | { type: "image_file"; image_file: { file_id: string } };

export interface ImageGenerationParams {
  model: string;
  prompt: string;
  size?: string;
  quality?: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class OpenAIClient {
  constructor(private readonly apiKey: string) {}

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeader(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  private get assistantsHeaders(): Record<string, string> {
    return {
      ...this.authHeader,
      ...ASSISTANTS_BETA_HEADER,
      "Content-Type": "application/json",
    };
  }

  /**
   * fetch() wrapper that retries on 5xx errors.
   * Returns the successful Response; throws OpenAIAPIError on final failure.
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    attempts = 3,
  ): Promise<Response> {
    for (let i = 0; i < attempts; i++) {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (i === attempts - 1 || res.status < 500) {
        const body = await res.text();
        throw new OpenAIAPIError(res.status, body);
      }
      await new Promise((r) => setTimeout(r, 250 * 2 ** i));
    }
    throw new Error("All retry attempts failed");
  }

  // ── Threads ────────────────────────────────────────────────────────────────

  /** Create a new thread and return its id. */
  async createThread(): Promise<string> {
    const res = await this.fetchWithRetry(`${OPENAI_BASE}/threads`, {
      method: "POST",
      headers: this.assistantsHeaders,
    });
    const data = await res.json();
    return data.id as string;
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  /** Add a message to a thread. */
  async addMessage(
    threadId: string,
    content: string | MessageContentItem[],
  ): Promise<void> {
    await this.fetchWithRetry(
      `${OPENAI_BASE}/threads/${threadId}/messages`,
      {
        method: "POST",
        headers: this.assistantsHeaders,
        body: JSON.stringify({
          role: "user",
          content: Array.isArray(content)
            ? content
            : [{ type: "text", text: content }],
        }),
      },
    );
  }

  /** Return the latest assistant reply in a thread. */
  async getLatestReply(threadId: string): Promise<string> {
    const res = await this.fetchWithRetry(
      `${OPENAI_BASE}/threads/${threadId}/messages?role=assistant&limit=1&order=desc`,
      { headers: { ...this.authHeader, ...ASSISTANTS_BETA_HEADER } },
    );
    const { data } = await res.json();
    return (data[0]?.content?.[0]?.text?.value as string) ?? "";
  }

  // ── Runs ───────────────────────────────────────────────────────────────────

  /** Create a run and return its id. */
  async createRun(threadId: string, assistantId: string): Promise<string> {
    const res = await this.fetchWithRetry(
      `${OPENAI_BASE}/threads/${threadId}/runs`,
      {
        method: "POST",
        headers: this.assistantsHeaders,
        body: JSON.stringify({ assistant_id: assistantId }),
      },
    );
    const data = await res.json();
    return data.id as string;
  }

  /** Poll until the run reaches a terminal state. Throws on failure/cancellation. */
  async waitForRun(threadId: string, runId: string): Promise<void> {
    let delay = 200;
    while (true) {
      const res = await this.fetchWithRetry(
        `${OPENAI_BASE}/threads/${threadId}/runs/${runId}`,
        { headers: { ...this.authHeader, ...ASSISTANTS_BETA_HEADER } },
      );
      const run = await res.json();
      if (run.status === "completed") return;
      if (["failed", "cancelled", "expired"].includes(run.status)) {
        throw new Error(`Run ${run.status}`);
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 1000);
    }
  }

  // ── Files ──────────────────────────────────────────────────────────────────

  /** Upload a file and return its id. */
  async uploadFile(
    blob: Blob,
    filename: string,
    purpose = "vision",
  ): Promise<string> {
    const form = new FormData();
    form.append("file", blob, filename);
    form.append("purpose", purpose);
    const res = await this.fetchWithRetry(`${OPENAI_BASE}/files`, {
      method: "POST",
      headers: { ...this.authHeader, ...ASSISTANTS_BETA_HEADER },
      body: form,
    });
    const data = await res.json();
    return data.id as string;
  }

  // ── Images API ─────────────────────────────────────────────────────────────

  /**
   * POST /v1/images/generations
   * Returns the raw Response so callers can handle abort signals and retry logic.
   */
  generateImage(
    params: ImageGenerationParams,
    signal?: AbortSignal,
  ): Promise<Response> {
    return fetch(`${OPENAI_BASE}/images/generations`, {
      method: "POST",
      headers: { ...this.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(params),
      ...(signal ? { signal } : {}),
    });
  }

  /**
   * POST /v1/images/edits
   * Caller must build the FormData (model, image, prompt, size, quality, etc.).
   * Returns the raw Response so callers can handle abort signals and retry logic.
   */
  editImage(form: FormData, signal?: AbortSignal): Promise<Response> {
    return fetch(`${OPENAI_BASE}/images/edits`, {
      method: "POST",
      headers: this.authHeader,
      body: form,
      ...(signal ? { signal } : {}),
    });
  }
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class OpenAIAPIError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`OpenAI API error ${status}: ${body}`);
    this.name = "OpenAIAPIError";
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createOpenAIClient(apiKey: string): OpenAIClient {
  return new OpenAIClient(apiKey);
}
