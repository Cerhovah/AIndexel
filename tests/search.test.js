import assert from "node:assert/strict";
import test from "node:test";

import { buildSearchIndex, searchRecords } from "../src/search.js";

function makeRecord(id, overrides = {}) {
  const analysis = {
    summary: "기본 작업 요약",
    feedback: "기본 피드백",
    next: "기본 다음 행동",
    project: "기본 프로젝트",
    task_types: ["analysis"],
    artifacts: ["document"],
    status: "done",
    keywords: ["기본", "테스트", "기록"],
    decisions: [],
    execution_summary: "기본 실행 흐름",
    ...overrides.analysis,
  };
  const record = {
    id,
    created_at: "2026-01-01T00:00:00.000Z",
    source_tool: "Manual",
    source_title: "",
    source_locator: "",
    raw_text: "",
    meta: {},
    ...overrides,
    analysis,
  };

  return { ...record, search: buildSearchIndex(record) };
}

test("01 단일 토큰이 summary에 있으면 검색된다", () => {
  const record = makeRecord("summary", { analysis: { summary: "로컬 검색 엔진 구현" } });
  assert.deepEqual(searchRecords([record], "검색"), [record]);
});

test("02 모든 토큰이 존재해야 결과에 포함된다", () => {
  const partial = makeRecord("partial", { analysis: { summary: "alpha만 존재" } });
  const complete = makeRecord("complete", { analysis: { summary: "alpha beta 모두 존재" } });
  assert.deepEqual(searchRecords([partial, complete], "alpha beta"), [complete]);
});

test("03 토큰이 서로 다른 필드에 있어도 포함된다", () => {
  const record = makeRecord("fields", {
    analysis: { project: "시공노트", feedback: "견적을 다시 검토한다" },
  });
  assert.deepEqual(searchRecords([record], "시공노트 견적"), [record]);
});

test("04 영문 대소문자를 무시한다", () => {
  const record = makeRecord("case", { analysis: { summary: "NodeJS 테스트 작성" } });
  assert.deepEqual(searchRecords([record], "nodejs"), [record]);
});

test("05 한글 부분 문자열이 일치한다", () => {
  const record = makeRecord("substring", { analysis: { summary: "견적서 검토를 완료했다" } });
  assert.deepEqual(searchRecords([record], "견적"), [record]);
});

test("06 project 일치가 raw_text 일치보다 상위다", () => {
  const raw = makeRecord("raw", { raw_text: "needle" });
  const project = makeRecord("project", { analysis: { project: "needle" } });
  assert.deepEqual(searchRecords([raw, project], "needle").map(({ id }) => id), ["project", "raw"]);
});

test("07 keywords 일치가 summary 일치보다 상위다", () => {
  const summary = makeRecord("summary", { analysis: { summary: "needle" } });
  const keywords = makeRecord("keywords", { analysis: { keywords: ["needle", "검색", "색인"] } });
  assert.deepEqual(searchRecords([summary, keywords], "needle").map(({ id }) => id), ["keywords", "summary"]);
});

test("08 점수가 같으면 created_at 최근순으로 정렬한다", () => {
  const older = makeRecord("older", {
    created_at: "2026-01-01T00:00:00.000Z",
    analysis: { summary: "needle" },
  });
  const newer = makeRecord("newer", {
    created_at: "2026-01-02T00:00:00.000Z",
    analysis: { summary: "needle" },
  });
  assert.deepEqual(searchRecords([older, newer], "needle").map(({ id }) => id), ["newer", "older"]);
});

test("09 빈 검색어는 최근순 최대 20건을 반환한다", () => {
  const records = Array.from({ length: 25 }, (_, index) => makeRecord(String(index), {
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
  }));
  assert.deepEqual(
    searchRecords(records, "").map(({ id }) => id),
    Array.from({ length: 20 }, (_, index) => String(24 - index)),
  );
});

test("10 공백만 있는 검색어는 최근순 최대 20건을 반환한다", () => {
  const records = Array.from({ length: 25 }, (_, index) => makeRecord(String(index), {
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
  }));
  assert.deepEqual(
    searchRecords(records, "  \n\t  ").map(({ id }) => id),
    Array.from({ length: 20 }, (_, index) => String(24 - index)),
  );
});
