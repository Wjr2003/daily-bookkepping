export type TransactionType = "expense" | "income";

export type TransactionRecord = {
  id: number;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  categoryLevel1: string;
  categoryLevel2: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type TransactionPayload = {
  type: TransactionType;
  amount: number;
  transactionDate: string;
  categoryLevel1: string;
  categoryLevel2: string;
  note: string;
};

export type CategoryGroup = {
  level1: string;
  level2: string[];
};
