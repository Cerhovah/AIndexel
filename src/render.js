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

export function renderRecentRecords(listElement, records) {
  if (records.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.textContent = "아직 저장된 기록이 없습니다.";
    listElement.replaceChildren(emptyState);
    return;
  }

  const items = records.map((record) => {
    const item = document.createElement("li");
    item.className = "recent-record";

    const date = document.createElement("time");
    date.className = "record-date";
    date.dateTime = record.createdAt;
    date.textContent = record.createdAtLabel;

    const summary = document.createElement("p");
    summary.className = "record-summary";
    summary.textContent = record.summary;

    item.append(date, summary);
    return item;
  });

  listElement.replaceChildren(...items);
}
