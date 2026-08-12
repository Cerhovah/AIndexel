const FIELD_WEIGHTS = {
  project: 16,
  keywords: 8,
  summary: 4,
  decisions: 3,
  execution_summary: 2,
  feedback: 2,
  next: 2,
  source_title: 2,
  tags: 1,
  raw_text: 1,
};

function normalize(value) {
  return value.toLowerCase();
}

function normalizeList(values) {
  return normalize(values.join(" "));
}

export function buildSearchIndex(record) {
  const { analysis } = record;

  return {
    project: normalize(analysis.project),
    keywords: normalizeList(analysis.keywords),
    summary: normalize(analysis.summary),
    decisions: normalizeList(analysis.decisions),
    execution_summary: normalize(analysis.execution_summary),
    feedback: normalize(analysis.feedback),
    next: normalize(analysis.next),
    source_title: normalize(record.source_title),
    tags: normalizeList([
      ...analysis.task_types,
      ...analysis.artifacts,
      analysis.status,
      record.source_tool,
    ]),
    raw_text: normalize(record.raw_text),
  };
}

export function searchRecords(records, query) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return [...records]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 20);
  }

  return records
    .map((record) => {
      const searchIndex = record.search ?? buildSearchIndex(record);
      const matches = tokens.every((token) => (
        Object.keys(FIELD_WEIGHTS).some((field) => searchIndex[field].includes(token))
      ));

      if (!matches) {
        return null;
      }

      const score = tokens.reduce((total, token) => (
        total + Object.entries(FIELD_WEIGHTS).reduce((tokenScore, [field, weight]) => (
          tokenScore + (searchIndex[field].includes(token) ? weight : 0)
        ), 0)
      ), 0);

      return { record, score };
    })
    .filter(Boolean)
    .sort((left, right) => (
      right.score - left.score
      || right.record.created_at.localeCompare(left.record.created_at)
    ))
    .slice(0, 20)
    .map(({ record }) => record);
}
