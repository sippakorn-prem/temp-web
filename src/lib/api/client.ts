/**
 * A failed API call. The status code travels with the error instead of being flattened
 * into a toast string — callers need it to tell "not your deal" (403) from "gone" (404)
 * from "we broke" (5xx). See CONVENTIONS.md, frontend section.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * The single way this app talks to the Go backend. Adds the bearer token, JSON headers
 * and error normalization — nothing else. No retries, no toasts, no status swallowing.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(path, {
    ...rest,
	cache: "no-store",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
	const error = (payload as { error?: { message?: string; code?: string } } | null)?.error;
    throw new ApiError(response.status, error?.message ?? `Request failed (${response.status})`, error?.code);
  }

  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as { data?: T };
  return payload.data as T;
}
