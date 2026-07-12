import type { TransactionRecord, TransactionType } from "./types";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY"
  }).format(value);

export const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const calculateTodayAmount = (
  transactions: TransactionRecord[],
  type: TransactionType
) => {
  const today = getTodayDate();
  return transactions
    .filter((item) => item.transactionDate === today && item.type === type)
    .reduce((sum, item) => sum + item.amount, 0);
};

export const calculateMonthAmount = (
  transactions: TransactionRecord[],
  type: TransactionType
) => {
  const prefix = getTodayDate().slice(0, 7);
  return transactions
    .filter((item) => item.transactionDate.startsWith(prefix) && item.type === type)
    .reduce((sum, item) => sum + item.amount, 0);
};

export const buildCategorySummary = (
  transactions: TransactionRecord[],
  type: TransactionType
) => {
  const map = new Map<string, number>();
  transactions
    .filter((item) => item.type === type)
    .forEach((item) => {
      map.set(item.categoryLevel1, (map.get(item.categoryLevel1) ?? 0) + item.amount);
    });

  return Array.from(map.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
};
