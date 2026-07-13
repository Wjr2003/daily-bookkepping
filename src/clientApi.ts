import { invoke } from "@tauri-apps/api/core";
import { getSystemCategoryGroups } from "./categoryData";
import type {
  CategoryGroup,
  CreateCustomLevel1Payload,
  CreateCustomLevel2Payload,
  RenameCustomLevel1Payload,
  RenameCustomLevel2Payload,
  TransactionPayload,
  TransactionRecord,
  TransactionType
} from "./types";

const TRANSACTION_STORAGE_KEY = "daily-bookkeeping-transactions";
const CATEGORY_STORAGE_KEY = "daily-bookkeeping-custom-categories";

type LocalCategoryStore = {
  expense: CategoryGroup[];
  income: CategoryGroup[];
  nextLevel1Id: number;
  nextLevel2Id: number;
};

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function readJson<T>(storageKey: string, fallback: T) {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(storageKey: string, value: unknown) {
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

function readLocalTransactions() {
  return readJson<TransactionRecord[]>(TRANSACTION_STORAGE_KEY, []);
}

function writeLocalTransactions(records: TransactionRecord[]) {
  writeJson(TRANSACTION_STORAGE_KEY, records);
}

function cloneSystemGroups(type: TransactionType) {
  return getSystemCategoryGroups(type).map((group) => ({
    ...group,
    level2Items: group.level2Items.map((item) => ({ ...item }))
  }));
}

function createLocalCategoryStore(): LocalCategoryStore {
  return {
    expense: cloneSystemGroups("expense"),
    income: cloneSystemGroups("income"),
    nextLevel1Id: 100000,
    nextLevel2Id: 200000
  };
}

function readLocalCategoryStore() {
  return readJson<LocalCategoryStore>(CATEGORY_STORAGE_KEY, createLocalCategoryStore());
}

function writeLocalCategoryStore(store: LocalCategoryStore) {
  writeJson(CATEGORY_STORAGE_KEY, store);
}

function getLocalGroups(type: TransactionType) {
  const store = readLocalCategoryStore();
  return {
    store,
    groups: type === "income" ? store.income : store.expense
  };
}

export async function listTransactions() {
  if (isTauriRuntime()) {
    return invoke<TransactionRecord[]>("list_transactions");
  }

  return readLocalTransactions().sort((a, b) => {
    if (a.transactionDate === b.transactionDate) {
      return b.id - a.id;
    }
    return a.transactionDate < b.transactionDate ? 1 : -1;
  });
}

export async function createTransaction(payload: TransactionPayload) {
  if (isTauriRuntime()) {
    return invoke<TransactionRecord>("create_transaction", { payload });
  }

  const current = readLocalTransactions();
  const nextId = current.length > 0 ? Math.max(...current.map((item) => item.id)) + 1 : 1;
  const now = new Date().toISOString();
  const created: TransactionRecord = {
    id: nextId,
    type: payload.type,
    amount: payload.amount,
    transactionDate: payload.transactionDate,
    categoryLevel1: payload.categoryLevel1,
    categoryLevel2: payload.categoryLevel2,
    note: payload.note,
    createdAt: now,
    updatedAt: now
  };
  writeLocalTransactions([created, ...current]);
  return created;
}

export async function updateTransaction(id: number, payload: TransactionPayload) {
  if (isTauriRuntime()) {
    return invoke<TransactionRecord>("update_transaction", { id, payload });
  }

  const current = readLocalTransactions();
  const existing = current.find((item) => item.id === id);
  if (!existing) {
    throw new Error("未找到要更新的记录");
  }

  const updated: TransactionRecord = {
    ...existing,
    type: payload.type,
    amount: payload.amount,
    transactionDate: payload.transactionDate,
    categoryLevel1: payload.categoryLevel1,
    categoryLevel2: payload.categoryLevel2,
    note: payload.note,
    updatedAt: new Date().toISOString()
  };

  writeLocalTransactions(current.map((item) => (item.id === id ? updated : item)));
  return updated;
}

export async function deleteTransaction(id: number) {
  if (isTauriRuntime()) {
    return invoke<void>("delete_transaction", { id });
  }

  const current = readLocalTransactions();
  writeLocalTransactions(current.filter((item) => item.id !== id));
}

export async function listCategoryGroups(type: TransactionType) {
  if (isTauriRuntime()) {
    return invoke<CategoryGroup[]>("list_category_groups", { recordType: type });
  }

  const { groups } = getLocalGroups(type);
  return groups;
}

export async function createCustomLevel1(payload: CreateCustomLevel1Payload) {
  if (isTauriRuntime()) {
    return invoke<CategoryGroup>("create_custom_level1", { payload });
  }

  const { store, groups } = getLocalGroups(payload.type);
  const normalizedLevel1Name = payload.level1Name.trim();
  const normalizedLevel2Name = payload.initialLevel2Name.trim();
  if (!normalizedLevel1Name || !normalizedLevel2Name) {
    throw new Error("分类名称不能为空");
  }
  if (groups.some((item) => item.level1 === normalizedLevel1Name)) {
    throw new Error("该一级分类已存在");
  }

  const created: CategoryGroup = {
    level1Id: store.nextLevel1Id++,
    level1: normalizedLevel1Name,
    level1Source: "custom",
    type: payload.type,
    level2Items: [
      {
        id: store.nextLevel2Id++,
        name: normalizedLevel2Name,
        source: "custom"
      }
    ]
  };
  groups.push(created);
  writeLocalCategoryStore(store);
  return created;
}

export async function createCustomLevel2(payload: CreateCustomLevel2Payload) {
  if (isTauriRuntime()) {
    return invoke<CategoryGroup>("create_custom_level2", { payload });
  }

  const store = readLocalCategoryStore();
  const groups = [...store.expense, ...store.income];
  const target = groups.find((item) => item.level1Id === payload.level1Id);
  if (!target) {
    throw new Error("未找到对应的一级分类");
  }

  const normalizedName = payload.name.trim();
  if (!normalizedName) {
    throw new Error("分类名称不能为空");
  }
  if (target.level2Items.some((item) => item.name === normalizedName)) {
    throw new Error("该二级分类已存在");
  }

  target.level2Items.push({
    id: store.nextLevel2Id++,
    name: normalizedName,
    source: "custom"
  });
  writeLocalCategoryStore(store);
  return target;
}

export async function renameCustomLevel1(payload: RenameCustomLevel1Payload) {
  if (isTauriRuntime()) {
    return invoke<CategoryGroup>("rename_custom_level1", { payload });
  }

  const store = readLocalCategoryStore();
  const groups = [...store.expense, ...store.income];
  const target = groups.find((item) => item.level1Id === payload.id);
  if (!target || target.level1Source !== "custom") {
    throw new Error("只能修改自定义一级分类");
  }

  const nextName = payload.name.trim();
  if (!nextName) {
    throw new Error("分类名称不能为空");
  }
  const siblings = target.type === "income" ? store.income : store.expense;
  if (siblings.some((item) => item.level1 !== target.level1 && item.level1 === nextName)) {
    throw new Error("该一级分类已存在");
  }

  const oldName = target.level1;
  target.level1 = nextName;
  writeLocalCategoryStore(store);

  const updatedTransactions = readLocalTransactions().map((item) =>
    item.type === target.type && item.categoryLevel1 === oldName
      ? { ...item, categoryLevel1: nextName, updatedAt: new Date().toISOString() }
      : item
  );
  writeLocalTransactions(updatedTransactions);

  return target;
}

export async function renameCustomLevel2(payload: RenameCustomLevel2Payload) {
  if (isTauriRuntime()) {
    return invoke<CategoryGroup>("rename_custom_level2", { payload });
  }

  const store = readLocalCategoryStore();
  const groups = [...store.expense, ...store.income];
  const targetGroup = groups.find((item) =>
    item.level2Items.some((level2) => level2.id === payload.id)
  );
  if (!targetGroup) {
    throw new Error("未找到对应的二级分类");
  }

  const targetLevel2 = targetGroup.level2Items.find((item) => item.id === payload.id);
  if (!targetLevel2 || targetLevel2.source !== "custom") {
    throw new Error("只能修改自定义二级分类");
  }

  const nextName = payload.name.trim();
  if (!nextName) {
    throw new Error("分类名称不能为空");
  }
  if (
    targetGroup.level2Items.some(
      (item) => item.id !== payload.id && item.name === nextName
    )
  ) {
    throw new Error("该二级分类已存在");
  }

  const oldName = targetLevel2.name;
  targetLevel2.name = nextName;
  writeLocalCategoryStore(store);

  const updatedTransactions = readLocalTransactions().map((item) =>
    item.type === targetGroup.type &&
    item.categoryLevel1 === targetGroup.level1 &&
    item.categoryLevel2 === oldName
      ? { ...item, categoryLevel2: nextName, updatedAt: new Date().toISOString() }
      : item
  );
  writeLocalTransactions(updatedTransactions);

  return targetGroup;
}

export async function deleteCustomLevel1(id: number) {
  if (isTauriRuntime()) {
    return invoke<void>("delete_custom_level1", { id });
  }

  const store = readLocalCategoryStore();
  const removeFromGroups = (groups: CategoryGroup[]) => {
    const index = groups.findIndex((item) => item.level1Id === id);
    if (index < 0) {
      return false;
    }
    if (groups[index].level1Source !== "custom") {
      throw new Error("系统一级分类不能删除");
    }
    groups.splice(index, 1);
    return true;
  };

  const removed = removeFromGroups(store.expense) || removeFromGroups(store.income);
  if (!removed) {
    throw new Error("未找到要删除的一级分类");
  }

  writeLocalCategoryStore(store);
}

export async function deleteCustomLevel2(id: number) {
  if (isTauriRuntime()) {
    return invoke<void>("delete_custom_level2", { id });
  }

  const store = readLocalCategoryStore();
  const groups = [...store.expense, ...store.income];
  const targetGroup = groups.find((item) =>
    item.level2Items.some((level2) => level2.id === id)
  );
  if (!targetGroup) {
    throw new Error("未找到要删除的二级分类");
  }

  const index = targetGroup.level2Items.findIndex((item) => item.id === id);
  if (index < 0 || targetGroup.level2Items[index].source !== "custom") {
    throw new Error("系统二级分类不能删除");
  }

  targetGroup.level2Items.splice(index, 1);
  writeLocalCategoryStore(store);
}
