export function renderSourceTools(selectElement, sourceTools) {
  const options = sourceTools.map((sourceTool) => {
    const option = document.createElement("option");
    option.value = sourceTool;
    option.textContent = sourceTool;
    return option;
  });

  selectElement.replaceChildren(...options);
}

export function renderInputState(
  { textarea, countOutput, errorElement },
  { characterCountLabel, exceedsMaximum },
) {
  countOutput.textContent = characterCountLabel;
  textarea.setAttribute("aria-invalid", String(exceedsMaximum));
  errorElement.textContent = exceedsMaximum
    ? "80,000자를 넘습니다. 나눠서 넣어 주세요."
    : "";
  errorElement.hidden = !exceedsMaximum;
}

export function renderAnalysis(resultElement, analysis) {
  resultElement.querySelector("#result-summary").textContent = analysis.summary;
  resultElement.querySelector("#result-feedback").textContent = analysis.feedback;
  resultElement.querySelector("#result-next").textContent = analysis.next;
  resultElement.hidden = false;
}

export function clearAnalysis(resultElement) {
  resultElement.hidden = true;
}
