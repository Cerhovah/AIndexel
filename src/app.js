import { analyze, fakeAnalyze } from "./api.js";
import {
  MAX_INPUT_CHARS,
  SOURCE_TOOLS,
  USE_FAKE_ANALYZER,
} from "./constants.js";
import {
  deleteRecord,
  exportAllAsJson,
  getAllRecords,
  saveRecord,
} from "./db.js";
import {
  clearAnalysis,
  renderAnalysis,
  renderInputState,
  renderSearchResults,
  renderSourceTools,
  toggleRecordDetail,
} from "./render.js";
import { buildSearchIndex, searchRecords } from "./search.js";

const captureTab = document.querySelector("#capture-tab");
const searchTab = document.querySelector("#search-tab");
const captureScreen = document.querySelector("#capture-screen");
const searchScreen = document.querySelector("#search-screen");
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
const searchInput = document.querySelector("#search-input");
const searchResultCount = document.querySelector("#search-result-count");
const searchResults = document.querySelector("#search-results");
const recordsStatus = document.querySelector("#records-status");
const appToken = document.querySelector("#app-token");
const saveTokenButton = document.querySelector("#save-token-button");
const tokenStatus = document.querySelector("#token-status");
const persistenceStatus = document.querySelector("#persistence-status");
const recordCount = document.querySelector("#record-count");
const exportButton = document.querySelector("#export-button");
const exportStatus = document.querySelector("#export-status");
const analyzeRequest = USE_FAKE_ANALYZER ? fakeAnalyze : analyze;
const numberFormatter = new Intl.NumberFormat("ko-KR");

let isAnalyzing = false;
let hasAnalysis = false;
let pendingRecord = null;
let shouldRequestPersistence = false;
let allRecords = [];

renderSourceTools(sourceTool, SOURCE_TOOLS);
const lastSourceTool = readSetting("wi_last_source_tool");
sourceTool.value = SOURCE_TOOLS.includes(lastSourceTool) ? lastSourceTool : SOURCE_TOOLS[0];
appToken.value = readSetting("wi_app_token");
setActiveScreen("capture");
updateInputState();
const recordsReady = initializeRecords();
refreshPersistenceStatus();

captureTab.addEventListener("click", () => setActiveScreen("capture"));
searchTab.addEventListener("click", () => setActiveScreen("search"));
textarea.addEventListener("input", updateInputState);
sourceTool.addEventListener("change", () => {
  writeSetting("wi_last_source_tool", sourceTool.value);
});
form.addEventListener("submit", handleAnalyze);
saveButton.addEventListener("click", handleSave);
searchInput.addEventListener("input", renderCurrentSearch);
searchResults.addEventListener("click", handleSearchResultClick);
saveTokenButton.addEventListener("click", handleTokenSave);
exportButton.addEventListener("click", handleExport);

function readSetting(key) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeSetting(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function setActiveScreen(screenName) {
  const showingCapture = screenName === "capture";

  captureScreen.hidden = !showingCapture;
  searchScreen.hidden = showingCapture;
  captureTab.setAttribute("aria-selected", String(showingCapture));
  searchTab.setAttribute("aria-selected", String(!showingCapture));
  captureTab.tabIndex = showingCapture ? 0 : -1;
  searchTab.tabIndex = showingCapture ? -1 : 0;
}

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
    const records = await refreshRecords();
    shouldRequestPersistence = records.length === 0;
  } catch {
    recordsStatus.textContent = "저장된 기록을 불러오지 못했습니다.";
  }
}

async function refreshRecords() {
  const records = await getAllRecords();
  const indexedRecords = [];

  for (const record of records) {
    if (record.search) {
      indexedRecords.push(record);
      continue;
    }

    const indexedRecord = { ...record, search: buildSearchIndex(record) };
    await saveRecord(indexedRecord);
    indexedRecords.push(indexedRecord);
  }

  allRecords = indexedRecords;
  recordCount.textContent = `${numberFormatter.format(allRecords.length)}건`;
  recordsStatus.textContent = "";
  renderCurrentSearch();
  return allRecords;
}

function renderCurrentSearch() {
  const matches = searchRecords(allRecords, searchInput.value);
  const emptyMessage = allRecords.length === 0
    ? "아직 저장된 기록이 없습니다."
    : "검색 결과가 없습니다.";

  searchResultCount.textContent = `${numberFormatter.format(matches.length)}건`;
  renderSearchResults(searchResults, matches.map(toRecordView), emptyMessage);
}

function toRecordView(record) {
  const locator = toLocatorView(record.source_locator);

  return {
    id: record.id,
    createdAt: record.created_at,
    createdAtLabel: new Date(record.created_at).toLocaleString("ko-KR"),
    summary: record.analysis.summary,
    feedback: record.analysis.feedback,
    next: record.analysis.next,
    project: record.analysis.project,
    taskTypes: record.analysis.task_types,
    artifacts: record.analysis.artifacts,
    status: record.analysis.status,
    keywords: record.analysis.keywords,
    decisions: record.analysis.decisions,
    executionSummary: record.analysis.execution_summary,
    sourceLocatorText: locator.text,
    sourceLocatorHref: locator.href,
    rawText: record.raw_text,
    versionLabel: `${record.meta.model_name} · ${record.meta.prompt_version}`,
    resultTags: [...record.analysis.task_types, record.analysis.status, record.source_tool],
  };
}

function toLocatorView(sourceLocatorValue) {
  if (!sourceLocatorValue) {
    return { text: "", href: "" };
  }

  try {
    const url = new URL(sourceLocatorValue);
    const href = ["http:", "https:"].includes(url.protocol) ? url.href : "";
    return { text: sourceLocatorValue, href };
  } catch {
    return { text: sourceLocatorValue, href: "" };
  }
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

    const record = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...pendingRecord,
    };
    record.search = buildSearchIndex(record);
    await saveRecord(record);
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

    await refreshPersistenceStatus();
  }

  textarea.value = "";
  pendingRecord = null;
  updateInputState();
  saveButton.textContent = "저장";

  try {
    await refreshRecords();
  } catch {
    recordsStatus.textContent = "최근 기록을 갱신하지 못했습니다.";
  }
}

function handleSearchResultClick(event) {
  const actionButton = event.target.closest("button[data-action]");

  if (!actionButton) {
    return;
  }

  if (actionButton.dataset.action === "toggle") {
    toggleRecordDetail(searchResults, actionButton.dataset.recordId);
    return;
  }

  if (actionButton.dataset.action === "delete") {
    handleDelete(actionButton.dataset.recordId);
  }
}

async function handleDelete(recordId) {
  if (!window.confirm("이 기록을 삭제할까요?")) {
    return;
  }

  try {
    await deleteRecord(recordId);
    await refreshRecords();
    recordsStatus.textContent = "삭제됨";
  } catch {
    recordsStatus.textContent = "삭제하지 못했습니다. 다시 시도해 주세요.";
  }
}

function handleTokenSave() {
  const saved = writeSetting("wi_app_token", appToken.value);
  tokenStatus.textContent = saved ? "저장됨" : "저장하지 못했습니다.";
}

async function refreshPersistenceStatus() {
  try {
    const persisted = await navigator.storage?.persisted?.();
    persistenceStatus.textContent = persisted ? "허용됨" : "미허용";
  } catch {
    persistenceStatus.textContent = "미허용";
  }
}

async function handleExport() {
  exportButton.disabled = true;
  exportStatus.textContent = "";

  try {
    const json = await exportAllAsJson();
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `workindex_backup_${formatDateStamp(new Date())}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    exportStatus.textContent = "내보냄";
  } catch {
    exportStatus.textContent = "내보내지 못했습니다.";
  } finally {
    exportButton.disabled = false;
  }
}

function formatDateStamp(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
