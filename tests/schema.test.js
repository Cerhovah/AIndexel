import assert from "node:assert/strict";
import test from "node:test";

import { validate } from "../worker/validate.js";

function validAnalysis() {
  return {
    summary: "WorkIndex 요구사항을 확정했다.",
    feedback: "저장소 유실 위험을 먼저 다뤄야 한다.",
    next: "실제 기록으로 프롬프트를 검증한다.",
    project: "WorkIndex",
    task_types: ["planning", "decision"],
    artifacts: ["document"],
    status: "ongoing",
    keywords: ["WorkIndex", "IndexedDB", "검색 색인"],
    decisions: ["데이터를 브라우저에만 저장한다"],
    execution_summary: "요구사항을 검토하고 구현 순서와 저장 방식을 확정했다.",
  };
}

test("01 정상 입력은 정규화 후 통과한다", () => {
  const input = validAnalysis();
  input.summary = "  WorkIndex 요구사항을 확정했다.  ";
  const result = validate(input);
  assert.equal(result.ok, true);
  assert.equal(result.value.summary, "WorkIndex 요구사항을 확정했다.");
});

test("02 summary 누락은 실패한다", () => {
  const input = validAnalysis();
  delete input.summary;
  assert.equal(validate(input).ok, false);
});

test("03 status 누락은 실패한다", () => {
  const input = validAnalysis();
  delete input.status;
  assert.equal(validate(input).ok, false);
});

test("04 keywords 누락은 실패한다", () => {
  const input = validAnalysis();
  delete input.keywords;
  assert.equal(validate(input).ok, false);
});

test("05 task_types의 사전 밖 값은 실패한다", () => {
  const input = validAnalysis();
  input.task_types = ["unknown"];
  assert.equal(validate(input).ok, false);
});

test("06 task_types는 1~3개여야 한다", () => {
  const tooMany = validAnalysis();
  tooMany.task_types = ["research", "learning", "planning", "coding"];
  const empty = validAnalysis();
  empty.task_types = [];
  assert.equal(validate(tooMany).ok, false);
  assert.equal(validate(empty).ok, false);
});

test('07 artifacts의 "none"은 단독으로만 통과한다', () => {
  const mixed = validAnalysis();
  mixed.artifacts = ["none", "code"];
  const alone = validAnalysis();
  alone.artifacts = ["none"];
  assert.equal(validate(mixed).ok, false);
  assert.equal(validate(alone).ok, true);
});

test("08 keywords의 개수와 항목 길이를 검증한다", () => {
  const tooFew = validAnalysis();
  tooFew.keywords = ["하나", "둘"];
  const tooMany = validAnalysis();
  tooMany.keywords = Array.from({ length: 9 }, (_, index) => `키워드${index}`);
  const tooLong = validAnalysis();
  tooLong.keywords = ["가".repeat(41), "둘", "셋"];
  assert.equal(validate(tooFew).ok, false);
  assert.equal(validate(tooMany).ok, false);
  assert.equal(validate(tooLong).ok, false);
});

test("09 decisions는 빈 배열을 허용하고 7개는 거부한다", () => {
  const empty = validAnalysis();
  empty.decisions = [];
  const tooMany = validAnalysis();
  tooMany.decisions = Array.from({ length: 7 }, (_, index) => `결정${index}`);
  assert.equal(validate(empty).ok, true);
  assert.equal(validate(tooMany).ok, false);
});

test("10 summary 301자는 실패한다", () => {
  const input = validAnalysis();
  input.summary = "가".repeat(301);
  assert.equal(validate(input).ok, false);
});

test('11 status "Done"은 소문자 정규화 후 통과한다', () => {
  const input = validAnalysis();
  input.status = " Done ";
  const result = validate(input);
  assert.equal(result.ok, true);
  assert.equal(result.value.status, "done");
});

test("12 execution_summary 길이와 타입을 검증한다", () => {
  const tooLong = validAnalysis();
  tooLong.execution_summary = "가".repeat(2001);
  const wrongType = validAnalysis();
  wrongType.execution_summary = 123;
  assert.equal(validate(tooLong).ok, false);
  assert.equal(validate(wrongType).ok, false);
});

test("13 추가 필드는 실패한다", () => {
  const input = validAnalysis();
  input.extra = "허용되지 않음";
  assert.equal(validate(input).ok, false);
});

test("14 task_types 중복은 정규화 후 실패한다", () => {
  const input = validAnalysis();
  input.task_types = ["Planning", "planning"];
  assert.equal(validate(input).ok, false);
});
