const DEFAULT_API_BASE_URL = "https://alblearn.almotech.co";
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, "") ||
  DEFAULT_API_BASE_URL;

const API_ROOT_URL = `${API_BASE_URL}/api`;
const API_V1_URL = `${API_ROOT_URL}/v1`;

let authToken: string | null = null;

if (typeof window !== "undefined") {
  const storedToken = window.localStorage.getItem("token");
  if (storedToken) {
    authToken = storedToken;
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type RequestParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: RequestParams;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  auth?: boolean;
  isFormData?: boolean;
  baseUrl?: string;
}

const buildUrl = (
  baseUrl: string,
  path: string,
  params?: RequestParams
): string => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("http")
    ? path
    : `${normalizedBase}${path.replace(/^\//, "")}`;

  const url = new URL(normalizedPath);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
  authToken = null;
};

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    params,
    headers,
    signal,
    auth = true,
    isFormData = false,
    baseUrl = API_V1_URL,
  } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  let requestBody: BodyInit | undefined;

  if (body !== undefined && body !== null) {
    if (isFormData || body instanceof FormData) {
      requestBody = body as BodyInit;
    } else if (typeof body === "string") {
      requestBody = body;
      if (!finalHeaders["Content-Type"]) {
        finalHeaders["Content-Type"] = "application/json";
      }
    } else {
      requestBody = JSON.stringify(body);
      finalHeaders["Content-Type"] = "application/json";
    }
  }

  if (auth) {
    const token =
      options.headers?.Authorization?.replace("Bearer ", "") || authToken;
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const url = buildUrl(baseUrl, path, params);

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: requestBody,
    signal,
  });

  if (!response.ok) {
    let errorData: unknown = null;
    let errorMessage = response.statusText || "Request failed";

    try {
      const text = await response.text();
      if (text) {
        errorData = JSON.parse(text);
        if (
          typeof errorData === "object" &&
          errorData &&
          "message" in errorData
        ) {
          errorMessage = String(
            (errorData as { message?: unknown }).message || errorMessage
          );
        }
      }
    } catch (parseError) {
      errorMessage = errorMessage || "Request failed";
    }

    throw new ApiError(response.status, errorMessage, errorData);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();
  if (!responseText) {
    return undefined as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch (parseError) {
    throw new ApiError(
      response.status,
      "Failed to parse response",
      responseText
    );
  }
}

export { API_ROOT_URL, API_V1_URL };
