import { WORKER_URL } from "./constants.js";

const FAKE_ANALYSIS = {
  summary: "WorkIndex v0.1의 요구사항을 단일 명세서로 확정하고 구현 순서를 M0~M6으로 확정했다.",
  feedback: "브라우저 저장소가 임시(best-effort)라는 위험을 내보내기 기능 없이 방치한 것이 가장 큰 놓친 위험이었다.",
  next: "실제 작업 기록 5건으로 0단계 프롬프트 검증을 수행해 GO/NO-GO를 판정한다.",
  project: "WorkIndex",
  task_types: ["planning", "decision"],
  artifacts: ["document"],
  status: "ongoing",
  keywords: ["WorkIndex", "IndexedDB", "Cloudflare Worker", "검색 색인", "구조화 출력"],
  decisions: [
    "저장 데이터를 서버가 아니라 브라우저에만 두기로 했다",
    "검색은 v0.1에서 문자열 일치로만 구현하기로 했다",
  ],
  execution_summary: "작업은 기존 명세의 검증 요청에서 시작했다. 저장 구조, 보안, 검색, 구현 순서를 차례로 점검했고, 브라우저 저장소 유실 위험이 발견되어 JSON 내보내기와 영구 저장 요청을 범위에 추가했다. 이후 마일스톤 M0~M6과 수용 기준 AC01~AC15를 확정했다.",
};

const FAKE_META = {
  model_provider: "fake",
  model_name: "fake",
  prompt_version: "wi-p1",
  schema_version: "wi-s1",
};

export async function analyze(input) {
  let response;

  try {
    response = await fetch(`${WORKER_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Token": readAppToken(),
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw {
      code: "UPSTREAM_ERROR",
      message: "분석 서버에 연결하지 못했습니다. 다시 시도해 주세요.",
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw {
      code: "UPSTREAM_ERROR",
      message: "분석 서버의 응답을 읽지 못했습니다. 다시 시도해 주세요.",
    };
  }

  if (!response.ok || payload?.ok !== true) {
    const code = payload?.error?.code ?? "UPSTREAM_ERROR";
    throw {
      code,
      message: frontendErrorMessage(code, payload?.error?.message),
    };
  }

  return { analysis: payload.analysis, meta: payload.meta };
}

export async function fakeAnalyze(_input) {
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    analysis: structuredClone(FAKE_ANALYSIS),
    meta: { ...FAKE_META },
  };
}

function readAppToken() {
  try {
    return localStorage.getItem("wi_app_token") ?? "";
  } catch {
    return "";
  }
}

function frontendErrorMessage(code, serverMessage) {
  if (code === "AUTH_FAILED") {
    return "설정에서 APP_TOKEN을 확인하세요.";
  }
  if (code === "UPSTREAM_TRUNCATED") {
    return "원문을 나눠서 다시 시도해 주세요.";
  }
  return serverMessage || "분석에 실패했습니다. 다시 시도해 주세요.";
}
