import { MAX_INPUT_CHARS, SCHEMA_VERSION, SOURCE_TOOLS } from "../src/constants.js";
import {
  buildRepairPrompt,
  OUTPUT_SCHEMA,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
} from "./prompt.js";
import { validate } from "./validate.js";

const ANALYZE_PATH = "/api/analyze";
const MAX_BODY_BYTES = 400000;
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MODEL_ENDPOINT = "https://api.anthropic.com/v1/messages";

class WorkerError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    try {
      const url = new URL(request.url);

      if (request.method === "OPTIONS" && url.pathname === ANALYZE_PATH) {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      if (request.method !== "POST" || url.pathname !== ANALYZE_PATH) {
        return errorResponse(404, "NOT_FOUND", "요청한 경로를 찾을 수 없습니다.", corsHeaders);
      }

      if (request.headers.get("X-App-Token") !== env.APP_TOKEN) {
        return errorResponse(401, "AUTH_FAILED", "APP_TOKEN이 올바르지 않습니다.", corsHeaders);
      }

      const contentLength = Number(request.headers.get("Content-Length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
        return errorResponse(413, "PAYLOAD_TOO_LARGE", "요청 본문이 너무 큽니다.", corsHeaders);
      }

      let bodyBuffer;
      try {
        bodyBuffer = await request.arrayBuffer();
      } catch {
        return errorResponse(400, "BAD_REQUEST", "요청 본문을 읽을 수 없습니다.", corsHeaders);
      }

      if (bodyBuffer.byteLength > MAX_BODY_BYTES) {
        return errorResponse(413, "PAYLOAD_TOO_LARGE", "요청 본문이 너무 큽니다.", corsHeaders);
      }

      let body;
      try {
        body = JSON.parse(new TextDecoder().decode(bodyBuffer));
      } catch {
        return errorResponse(400, "BAD_REQUEST", "요청 본문은 올바른 JSON이어야 합니다.", corsHeaders);
      }

      const input = validateRequest(body);
      if (!input.ok) {
        return errorResponse(400, "BAD_REQUEST", input.message, corsHeaders);
      }

      const result = await analyzeWithClaude(input.value, env);
      return jsonResponse({
        ok: true,
        analysis: result.analysis,
        meta: {
          model_provider: "anthropic",
          model_name: result.modelName,
          prompt_version: PROMPT_VERSION,
          schema_version: SCHEMA_VERSION,
        },
      }, 200, corsHeaders);
    } catch (error) {
      if (error instanceof WorkerError) {
        return errorResponse(502, error.code, error.message, corsHeaders);
      }

      return errorResponse(
        502,
        "UPSTREAM_ERROR",
        "모델 API 통신에 실패했습니다. 다시 시도해 주세요.",
        corsHeaders,
      );
    }
  },
};

function validateRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "요청 본문은 객체여야 합니다." };
  }

  if (typeof body.raw_text !== "string" || body.raw_text.length < 1) {
    return { ok: false, message: "raw_text는 1자 이상의 문자열이어야 합니다." };
  }
  if (body.raw_text.length > MAX_INPUT_CHARS) {
    return { ok: false, message: "raw_text는 80,000자 이하여야 합니다." };
  }
  if (typeof body.source_tool !== "string" || !SOURCE_TOOLS.includes(body.source_tool)) {
    return { ok: false, message: "source_tool 값이 올바르지 않습니다." };
  }
  if (body.source_title !== undefined && typeof body.source_title !== "string") {
    return { ok: false, message: "source_title은 문자열이어야 합니다." };
  }
  if (body.source_locator !== undefined && typeof body.source_locator !== "string") {
    return { ok: false, message: "source_locator는 문자열이어야 합니다." };
  }

  return {
    ok: true,
    value: {
      raw_text: body.raw_text,
      source_tool: body.source_tool,
      source_title: body.source_title ?? "",
      source_locator: body.source_locator ?? "",
    },
  };
}

async function analyzeWithClaude(input, env) {
  const userMessage = `[출처 도구] ${input.source_tool}
[제목] ${input.source_title || "없음"}
--- 작업 기록 원문 시작 ---
${input.raw_text}
--- 작업 기록 원문 끝 ---`;
  const firstResult = await callClaude(env, [{ role: "user", content: userMessage }]);
  const firstValidation = parseAndValidate(firstResult.text);

  if (firstValidation.ok) {
    return { analysis: firstValidation.value, modelName: firstResult.modelName };
  }

  const repairPrompt = buildRepairPrompt(firstValidation.errors, firstResult.text);
  const repairResult = await callClaude(env, [
    { role: "user", content: userMessage },
    { role: "assistant", content: firstResult.text || "{}" },
    { role: "user", content: repairPrompt },
  ]);
  const repairValidation = parseAndValidate(repairResult.text);

  if (!repairValidation.ok) {
    throw new WorkerError(
      "SCHEMA_INVALID",
      "모델 응답 형식을 확인하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  return { analysis: repairValidation.value, modelName: repairResult.modelName };
}

async function callClaude(env, messages) {
  const model = env.MODEL_NAME || DEFAULT_MODEL;
  let response;

  try {
    response = await fetch(MODEL_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": env.MODEL_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages,
        output_config: {
          format: {
            type: "json_schema",
            schema: OUTPUT_SCHEMA,
          },
        },
      }),
    });
  } catch {
    throw new WorkerError(
      "UPSTREAM_ERROR",
      "모델 API 통신에 실패했습니다. 다시 시도해 주세요.",
    );
  }

  if (!response.ok) {
    throw new WorkerError(
      "UPSTREAM_ERROR",
      "모델 API 통신에 실패했습니다. 다시 시도해 주세요.",
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new WorkerError(
      "UPSTREAM_ERROR",
      "모델 API 통신에 실패했습니다. 다시 시도해 주세요.",
    );
  }

  if (payload.stop_reason === "max_tokens") {
    throw new WorkerError(
      "UPSTREAM_TRUNCATED",
      "모델 출력이 잘렸습니다. 원문을 나눠서 다시 시도해 주세요.",
    );
  }
  if (payload.stop_reason === "refusal") {
    throw new WorkerError("UPSTREAM_REFUSED", "모델이 분석 요청을 거부했습니다.");
  }

  const text = Array.isArray(payload.content)
    ? payload.content
      .filter((block) => block?.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("")
    : "";

  return { text, modelName: payload.model || model };
}

function parseAndValidate(text) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["JSON 형식이 아닙니다."] };
  }

  return validate(parsed);
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = String(env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((allowedOrigin) => allowedOrigin.trim())
    .filter(Boolean);

  if (!origin || !allowedOrigins.includes(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, X-App-Token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function errorResponse(status, code, message, corsHeaders) {
  return jsonResponse({ ok: false, error: { code, message } }, status, corsHeaders);
}

function jsonResponse(body, status, corsHeaders) {
  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}
