export type TransactionType = "expense" | "income";

export type CategorySource = "system" | "custom";

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

export type CategoryLevel2 = {
  id: number;
  name: string;
  source: CategorySource;
};

export type CategoryGroup = {
  level1Id: number;
  level1: string;
  level1Source: CategorySource;
  type: TransactionType;
  level2Items: CategoryLevel2[];
};

export type CreateCustomLevel1Payload = {
  type: TransactionType;
  level1Name: string;
  initialLevel2Name: string;
};

export type CreateCustomLevel2Payload = {
  level1Id: number;
  name: string;
};

export type RenameCustomLevel1Payload = {
  id: number;
  name: string;
};

export type RenameCustomLevel2Payload = {
  id: number;
  name: string;
};
