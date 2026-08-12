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

export function renderSearchResults(listElement, records, emptyMessage) {
  if (records.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.textContent = emptyMessage;
    listElement.replaceChildren(emptyState);
    return;
  }

  listElement.replaceChildren(...records.map(createSearchResult));
}

export function toggleRecordDetail(listElement, recordId) {
  const detail = [...listElement.querySelectorAll("[data-detail-id]")]
    .find((element) => element.dataset.detailId === recordId);
  const button = [...listElement.querySelectorAll("button[data-action='toggle']")]
    .find((element) => element.dataset.recordId === recordId);

  if (!detail || !button) {
    return;
  }

  detail.hidden = !detail.hidden;
  button.setAttribute("aria-expanded", String(!detail.hidden));
}

function createSearchResult(record) {
  const item = document.createElement("li");
  item.className = "search-result";

  const toggle = document.createElement("button");
  toggle.className = "record-toggle";
  toggle.type = "button";
  toggle.dataset.action = "toggle";
  toggle.dataset.recordId = record.id;
  toggle.setAttribute("aria-expanded", "false");

  const heading = document.createElement("span");
  heading.className = "record-heading";

  const date = document.createElement("time");
  date.className = "record-date";
  date.dateTime = record.createdAt;
  date.textContent = record.createdAtLabel;

  heading.append(date, createTagList(record.resultTags));

  const summary = document.createElement("span");
  summary.className = "record-summary";
  summary.textContent = record.summary;
  toggle.append(heading, summary);

  const detail = createRecordDetail(record);
  item.append(toggle, detail);
  return item;
}

function createRecordDetail(record) {
  const detail = document.createElement("div");
  detail.className = "record-detail";
  detail.dataset.detailId = record.id;
  detail.hidden = true;

  const sentences = document.createElement("dl");
  sentences.className = "detail-sentences";
  appendDetailRow(sentences, "오늘 한 일", record.summary);
  appendDetailRow(sentences, "핵심 피드백", record.feedback);
  appendDetailRow(sentences, "다음 행동", record.next);

  const index = document.createElement("dl");
  index.className = "detail-index";
  appendDetailRow(index, "프로젝트", record.project);
  appendTagRow(index, "작업 유형", record.taskTypes);
  appendTagRow(index, "산출물", record.artifacts);
  appendDetailRow(index, "상태", record.status);
  appendTagRow(index, "키워드", record.keywords);
  appendListRow(index, "결정", record.decisions);
  appendDetailRow(index, "실행 흐름", record.executionSummary);

  if (record.sourceLocatorText) {
    const locator = record.sourceLocatorHref
      ? createLocatorLink(record.sourceLocatorText, record.sourceLocatorHref)
      : document.createTextNode(record.sourceLocatorText);
    appendDetailRow(index, "원위치", locator);
  }

  const rawText = document.createElement("details");
  rawText.className = "raw-text";
  const rawSummary = document.createElement("summary");
  rawSummary.textContent = "원문 보기";
  const rawContent = document.createElement("pre");
  rawContent.textContent = record.rawText;
  rawText.append(rawSummary, rawContent);

  const version = document.createElement("p");
  version.className = "record-version";
  version.textContent = record.versionLabel;

  const deleteButton = document.createElement("button");
  deleteButton.className = "danger-button";
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.recordId = record.id;
  deleteButton.textContent = "삭제";

  detail.append(sentences, index, rawText, version, deleteButton);
  return detail;
}

function appendDetailRow(list, label, value) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;

  if (value instanceof Node) {
    description.append(value);
  } else {
    description.textContent = value;
  }

  row.append(term, description);
  list.append(row);
}

function appendTagRow(list, label, values) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.append(createTagList(values));
  row.append(term, description);
  list.append(row);
}

function appendListRow(list, label, values) {
  if (values.length === 0) {
    appendDetailRow(list, label, "없음");
    return;
  }

  const bullets = document.createElement("ul");
  bullets.className = "decision-list";

  for (const value of values) {
    const item = document.createElement("li");
    item.textContent = value;
    bullets.append(item);
  }

  appendDetailRow(list, label, bullets);
}

function createTagList(values) {
  const list = document.createElement("span");
  list.className = "tag-list";

  for (const value of values) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = value;
    list.append(tag);
  }

  return list;
}

function createLocatorLink(text, href) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = text;
  return link;
}
