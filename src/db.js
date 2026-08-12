import { SCHEMA_VERSION } from "./constants.js";

const DATABASE_NAME = "workindex_v1";
const DATABASE_VERSION = 1;
const STORE_NAME = "records";
const CREATED_AT_INDEX = "by_created_at";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(STORE_NAME)
        ? request.transaction.objectStore(STORE_NAME)
        : database.createObjectStore(STORE_NAME, { keyPath: "id" });

      if (!store.indexNames.contains(CREATED_AT_INDEX)) {
        store.createIndex(CREATED_AT_INDEX, "created_at");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB 연결이 차단되었습니다."));
  });
}

async function runRequest(mode, createRequest) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;
    let request;

    try {
      request = createRequest(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }

    request.onsuccess = () => {
      result = request.result;
    };

    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? request.error);
    };

    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? request.error);
    };
  });
}

export async function saveRecord(record) {
  await runRequest("readwrite", (store) => store.put(record));
  return record.id;
}

export async function getRecord(id) {
  const record = await runRequest("readonly", (store) => store.get(id));
  return record ?? null;
}

export async function getAllRecords() {
  const records = await runRequest("readonly", (store) => store.index(CREATED_AT_INDEX).getAll());
  return records.sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export async function deleteRecord(id) {
  await runRequest("readwrite", (store) => store.delete(id));
}

export async function exportAllAsJson() {
  return JSON.stringify({
    exported_at: new Date().toISOString(),
    app: "workindex",
    schema_version: SCHEMA_VERSION,
    records: await getAllRecords(),
  }, null, 2);
}
