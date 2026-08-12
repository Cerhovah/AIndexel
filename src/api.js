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

export async function analyze(_input) {
  throw { code: "NOT_IMPLEMENTED", message: "실제 분석은 M4에서 연결됩니다." };
}

export async function fakeAnalyze(_input) {
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    analysis: structuredClone(FAKE_ANALYSIS),
    meta: { ...FAKE_META },
  };
}
