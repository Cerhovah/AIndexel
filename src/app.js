import { analyze, fakeAnalyze } from "./api.js";
import {
  MAX_INPUT_CHARS,
  SOURCE_TOOLS,
  USE_FAKE_ANALYZER,
} from "./constants.js";
import {
  clearAnalysis,
  renderAnalysis,
  renderInputState,
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
const analyzeRequest = USE_FAKE_ANALYZER ? fakeAnalyze : analyze;

let isAnalyzing = false;
let hasAnalysis = false;
const numberFormatter = new Intl.NumberFormat("ko-KR");

renderSourceTools(sourceTool, SOURCE_TOOLS);
updateInputState();

textarea.addEventListener("input", updateInputState);
form.addEventListener("submit", handleAnalyze);

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
  clearAnalysis(analysisResult);
  analysisStatus.textContent = "분석 중";
  analyzeButton.textContent = "분석 중";
  updateInputState();

  try {
    const result = await analyzeRequest({
      raw_text: textarea.value,
      source_tool: sourceTool.value,
      source_title: sourceTitle.value,
      source_locator: sourceLocator.value,
    });

    renderAnalysis(analysisResult, result.analysis);
    hasAnalysis = true;
    analysisStatus.textContent = "분석 완료";
  } catch (error) {
    analysisStatus.textContent = error?.message ?? "분석에 실패했습니다. 다시 시도해 주세요.";
  } finally {
    isAnalyzing = false;
    analyzeButton.textContent = hasAnalysis ? "다시 분석" : "분석";
    updateInputState();
  }
}
