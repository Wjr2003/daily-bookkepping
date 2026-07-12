import { invoke } from "@tauri-apps/api/core";
import type { TransactionPayload, TransactionRecord } from "./types";

const STORAGE_KEY = "daily-bookkeeping-transactions";

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function readLocalTransactions() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [] as TransactionRecord[];
  }

  try {
    const parsed = JSON.parse(raw) as TransactionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalTransactions(records: TransactionRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
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
