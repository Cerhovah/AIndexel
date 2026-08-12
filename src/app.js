import { analyze, fakeAnalyze } from "./api.js";
import {
  MAX_INPUT_CHARS,
  SOURCE_TOOLS,
  USE_FAKE_ANALYZER,
} from "./constants.js";
import { getAllRecords, saveRecord } from "./db.js";
import {
  clearAnalysis,
  renderAnalysis,
  renderInputState,
  renderRecentRecords,
  renderSourceTools,
} from "./render.js";

const form = document.querySelector("#capture-form");
const textarea = document.querySelector("#raw-text");
const sourceTool = document.querySelector("#source-tool");
const sourceTitle = document.querySelector("#source-title");
const sourceLocator = document.querySelector("#source-locator");
const countOutput = document.querySelector("#character-count");
const inputError = document.querySelector("#input-error");
const analyzeButton = document.querySelector("#analyze-button");
const analysisStatus = document.querySelector("#analysis-status");
const analysisResult = document.querySelector("#analysis-result");
const saveButton = document.querySelector("#save-button");
const saveStatus = document.querySelector("#save-status");
const recordCount = document.querySelector("#record-count");
const recordsStatus = document.querySelector("#records-status");
const recentRecords = document.querySelector("#recent-records");
const analyzeRequest = USE_FAKE_ANALYZER ? fakeAnalyze : analyze;

let isAnalyzing = false;
let hasAnalysis = false;
let pendingRecord = null;
let shouldRequestPersistence = false;
const numberFormatter = new Intl.NumberFormat("ko-KR");

renderSourceTools(sourceTool, SOURCE_TOOLS);
updateInputState();
const recordsReady = initializeRecords();

textarea.addEventListener("input", updateInputState);
form.addEventListener("submit", handleAnalyze);
saveButton.addEventListener("click", handleSave);

function updateInputState() {
  const characterCount = textarea.value.length;

  renderInputState(
    { textarea, countOutput, errorElement: inputError },
    {
      characterCountLabel: `${numberFormatter.format(characterCount)} / ${numberFormatter.format(MAX_INPUT_CHARS)}`,
      exceedsMaximum: characterCount > MAX_INPUT_CHARS,
    },
  );

  analyzeButton.disabled = isAnalyzing
    || characterCount === 0
    || characterCount > MAX_INPUT_CHARS;
}

async function handleAnalyze(event) {
  event.preventDefault();

  if (isAnalyzing || textarea.value.length === 0 || textarea.value.length > MAX_INPUT_CHARS) {
    return;
  }

  isAnalyzing = true;
  hasAnalysis = false;
  pendingRecord = null;
  clearAnalysis(analysisResult);
  saveStatus.textContent = "";
  analysisStatus.textContent = "분석 중";
  analyzeButton.textContent = "분석 중";
  updateInputState();

  try {
    const input = {
      raw_text: textarea.value,
      source_tool: sourceTool.value,
      source_title: sourceTitle.value,
      source_locator: sourceLocator.value,
    };
    const result = await analyzeRequest(input);

    renderAnalysis(analysisResult, result.analysis);
    pendingRecord = {
      ...input,
      analysis: result.analysis,
      meta: result.meta,
    };
    hasAnalysis = true;
    saveButton.disabled = false;
    analysisStatus.textContent = "분석 완료";
  } catch (error) {
    analysisStatus.textContent = error?.message ?? "분석에 실패했습니다. 다시 시도해 주세요.";
  } finally {
    isAnalyzing = false;
    analyzeButton.textContent = hasAnalysis ? "다시 분석" : "분석";
    updateInputState();
  }
}

async function initializeRecords() {
  try {
    const records = await refreshRecentRecords();
    shouldRequestPersistence = records.length === 0;
  } catch {
    recordsStatus.textContent = "저장된 기록을 불러오지 못했습니다.";
  }
}

async function refreshRecentRecords() {
  const records = await getAllRecords();
  recordCount.textContent = `${numberFormatter.format(records.length)}건`;
  renderRecentRecords(recentRecords, records.slice(0, 20).map((record) => ({
    createdAt: record.created_at,
    createdAtLabel: new Date(record.created_at).toLocaleString("ko-KR"),
    summary: record.analysis.summary,
  })));
  recordsStatus.textContent = "";
  return records;
}

async function handleSave() {
  if (!pendingRecord) {
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "저장 중";
  saveStatus.textContent = "";

  try {
    await recordsReady;

    await saveRecord({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...pendingRecord,
    });
  } catch {
    saveStatus.textContent = "저장하지 못했습니다. 다시 시도해 주세요.";
    saveButton.disabled = false;
    saveButton.textContent = "저장";
    return;
  }

  saveStatus.textContent = "저장됨";

  if (shouldRequestPersistence) {
    shouldRequestPersistence = false;

    try {
      await navigator.storage?.persist?.();
    } catch {
      // The record is already saved. Persistence remains best-effort.
    }
  }

  textarea.value = "";
  pendingRecord = null;
  updateInputState();
  saveButton.textContent = "저장";

  try {
    await refreshRecentRecords();
  } catch {
    recordsStatus.textContent = "최근 기록을 갱신하지 못했습니다.";
  }
}
