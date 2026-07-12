import { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction
} from "./api";
import { getCategoryGroups } from "./data";
import type {
  TransactionPayload,
  TransactionRecord,
  TransactionType
} from "./types";
import {
  buildCategorySummary,
  calculateMonthAmount,
  calculateTodayAmount,
  formatCurrency,
  getTodayDate
} from "./utils";

const navItems = [
  { to: "/", label: "首页" },
  { to: "/new", label: "新增记录" },
  { to: "/transactions", label: "收支明细" },
  { to: "/stats", label: "收支统计" }
];

const pieColors = ["#ff7a59", "#5b8def", "#2cb67d", "#f4b740", "#8a5cf6", "#ff5d8f"];

function App() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const todayExpense = useMemo(
    () => calculateTodayAmount(transactions, "expense"),
    [transactions]
  );
  const todayIncome = useMemo(
    () => calculateTodayAmount(transactions, "income"),
    [transactions]
  );
  const monthExpense = useMemo(
    () => calculateMonthAmount(transactions, "expense"),
    [transactions]
  );
  const monthIncome = useMemo(
    () => calculateMonthAmount(transactions, "income"),
    [transactions]
  );
  const expenseSummary = useMemo(
    () => buildCategorySummary(transactions, "expense"),
    [transactions]
  );
  const incomeSummary = useMemo(
    () => buildCategorySummary(transactions, "income"),
    [transactions]
  );
  const selectedTransaction =
    transactions.find((item) => item.id === selectedId) ?? transactions[0];

  useEffect(() => {
    void refreshTransactions();
  }, []);

  async function refreshTransactions() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const records = await listTransactions();
      setTransactions(records);
      setSelectedId(records[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "加载收支记录失败"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTransaction(payload: TransactionPayload) {
    setErrorMessage("");
    try {
      const created = await createTransaction(payload);
      setTransactions((current) => [created, ...current]);
      setSelectedId(created.id);
      setIsQuickEntryOpen(false);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "保存记录失败"));
    }
  }

  async function handleUpdateTransaction(id: number, payload: TransactionPayload) {
    setErrorMessage("");
    try {
      const updated = await updateTransaction(id, payload);
      setTransactions((current) =>
        current.map((item) => (item.id === id ? updated : item))
      );
      setSelectedId(updated.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "更新记录失败"));
    }
  }

  async function handleDeleteTransaction(id: number) {
    setErrorMessage("");
    try {
      await deleteTransaction(id);
      setTransactions((current) => current.filter((item) => item.id !== id));
      setSelectedId((current) => {
        if (current !== id) {
          return current;
        }
        const fallback = transactions.find((item) => item.id !== id);
        return fallback?.id ?? null;
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "删除记录失败"));
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="ambient ambient-c" />

      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">
            <WalletIcon />
          </div>
          <div>
            <p className="eyebrow">每日记账</p>
            <h1>用更有情绪感的收支面板，把每天的钱流看清楚</h1>
            <p className="topbar-copy">
              现在支持收入和支出双向记录，页面也升级成更丰富的动画卡片风格。
            </p>
          </div>
        </div>

        <div className="topbar-actions">
          <nav className="nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button className="primary-button large-button" onClick={() => setIsQuickEntryOpen(true)}>
            <PlusIcon />
            快速新增
          </button>
        </div>
      </header>

      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <main className="page">
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                isLoading={isLoading}
                todayExpense={todayExpense}
                todayIncome={todayIncome}
                monthExpense={monthExpense}
                monthIncome={monthIncome}
                transactions={transactions}
                expenseSummary={expenseSummary}
                incomeSummary={incomeSummary}
                onOpenQuickEntry={() => setIsQuickEntryOpen(true)}
              />
            }
          />
          <Route
            path="/new"
            element={
              <TransactionFormPage
                title="新增收支记录"
                description="这里保留完整录入页，支持收入和支出两种记录，也会根据类型切换分类。"
                onSubmit={handleCreateTransaction}
              />
            }
          />
          <Route
            path="/transactions"
            element={
              <TransactionListPage
                transactions={transactions}
                selectedId={selectedId}
                selectedTransaction={selectedTransaction}
                onSelect={setSelectedId}
                onDelete={handleDeleteTransaction}
                onUpdate={handleUpdateTransaction}
              />
            }
          />
          <Route
            path="/stats"
            element={
              <StatsPage
                monthExpense={monthExpense}
                monthIncome={monthIncome}
                expenseSummary={expenseSummary}
                incomeSummary={incomeSummary}
              />
            }
          />
        </Routes>
      </main>

      {isQuickEntryOpen ? (
        <div className="modal-mask" onClick={() => setIsQuickEntryOpen(false)}>
          <div className="modal-panel animated-pop" onClick={(event) => event.stopPropagation()}>
            <TransactionForm
              title="快速新增记录"
              compact
              onSubmit={handleCreateTransaction}
              onCancel={() => setIsQuickEntryOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DashboardPage({
  isLoading,
  todayExpense,
  todayIncome,
  monthExpense,
  monthIncome,
  transactions,
  expenseSummary,
  incomeSummary,
  onOpenQuickEntry
}: {
  isLoading: boolean;
  todayExpense: number;
  todayIncome: number;
  monthExpense: number;
  monthIncome: number;
  transactions: TransactionRecord[];
  expenseSummary: { name: string; amount: number }[];
  incomeSummary: { name: string; amount: number }[];
  onOpenQuickEntry: () => void;
}) {
  const monthBalance = monthIncome - monthExpense;
  const latestIncome = transactions.find((item) => item.type === "income");
  const latestExpense = transactions.find((item) => item.type === "expense");

  return (
    <div className="stack-page">
      <section className="hero-card animated-rise">
        <div className="hero-content">
          <div className="hero-badges">
            <StatusPill label="动画风格" />
            <StatusPill label="双向记账" />
            <StatusPill label="本地保存" />
          </div>
          <h2>收入、支出、结余，放在一个会动的仪表盘里。</h2>
          <p className="hero-copy">
            首页现在更像一个有层次的财务驾驶舱。你可以快速录入，也能立刻看到今天和本月的收支状态。
          </p>
          <div className="hero-actions">
            <button className="primary-button large-button" onClick={onOpenQuickEntry}>
              <SparkIcon />
              现在记一笔
            </button>
            <div className="hero-note">
              <ClockIcon />
              <span>{isLoading ? "正在同步数据..." : `已载入 ${transactions.length} 笔记录`}</span>
            </div>
          </div>
        </div>

        <div className="hero-side">
          <div className="hero-orbit hero-orbit-income">
            <IncomeIcon />
            <span>收入</span>
          </div>
          <div className="hero-orbit hero-orbit-expense">
            <ExpenseIcon />
            <span>支出</span>
          </div>
          <div className="hero-orbit hero-orbit-balance">
            <BalanceIcon />
            <span>结余</span>
          </div>
        </div>
      </section>

      <section className="stats-grid stats-grid-five">
        <MetricCard label="今日收入" value={formatCurrency(todayIncome)} accent="income" icon={<IncomeIcon />} />
        <MetricCard label="今日支出" value={formatCurrency(todayExpense)} accent="expense" icon={<ExpenseIcon />} />
        <MetricCard label="本月收入" value={formatCurrency(monthIncome)} accent="income" icon={<TrendUpIcon />} />
        <MetricCard label="本月支出" value={formatCurrency(monthExpense)} accent="expense" icon={<TrendDownIcon />} />
        <MetricCard label="本月结余" value={formatCurrency(monthBalance)} accent="balance" icon={<BalanceIcon />} />
      </section>

      <section className="dashboard-grid">
        <article className="panel animated-rise delay-1">
          <SectionTitle
            title="最近收支记录"
            caption={isLoading ? "正在加载" : `最近 ${Math.min(transactions.length, 5)} 笔`}
            icon={<ListIcon />}
          />
          <div className="record-list">
            {transactions.length > 0 ? (
              transactions.slice(0, 5).map((item) => (
                <div key={item.id} className="record-item rich-record">
                  <div className={`record-icon-badge ${item.type}`}>
                    {item.type === "income" ? <IncomeIcon /> : <ExpenseIcon />}
                  </div>
                  <div className="record-main">
                    <strong>
                      {item.type === "income" ? "收入" : "支出"} · {item.categoryLevel2}
                    </strong>
                    <p>
                      {item.transactionDate} · {item.categoryLevel1}
                    </p>
                  </div>
                  <span className={item.type === "income" ? "income-text" : "expense-text"}>
                    {item.type === "income" ? "+" : "-"}
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))
            ) : (
              <p className="empty-copy">还没有收支记录，先新增第一笔吧。</p>
            )}
          </div>
        </article>

        <article className="panel animated-rise delay-2">
          <SectionTitle
            title="本月分类摘要"
            caption="支出与收入"
            icon={<CategoryIcon />}
          />
          <div className="summary-section">
            <h4>
              <ExpenseIcon />
              支出分类
            </h4>
            <div className="summary-list">
              {expenseSummary.length > 0 ? (
                expenseSummary.slice(0, 4).map((item) => (
                  <div key={item.name} className="summary-row">
                    <span>{item.name}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                ))
              ) : (
                <p className="empty-copy">暂无支出记录。</p>
              )}
            </div>
          </div>
          <div className="summary-section">
            <h4>
              <IncomeIcon />
              收入分类
            </h4>
            <div className="summary-list">
              {incomeSummary.length > 0 ? (
                incomeSummary.slice(0, 4).map((item) => (
                  <div key={item.name} className="summary-row">
                    <span>{item.name}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                ))
              ) : (
                <p className="empty-copy">暂无收入记录。</p>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="insight-grid">
        <article className="insight-card animated-rise delay-2">
          <div className="insight-header">
            <IncomeIcon />
            <span>最近收入</span>
          </div>
          <strong>{latestIncome ? latestIncome.categoryLevel2 : "暂无收入"}</strong>
          <p>{latestIncome ? formatCurrency(latestIncome.amount) : "等你录入第一笔收入"}</p>
        </article>
        <article className="insight-card animated-rise delay-3">
          <div className="insight-header">
            <ExpenseIcon />
            <span>最近支出</span>
          </div>
          <strong>{latestExpense ? latestExpense.categoryLevel2 : "暂无支出"}</strong>
          <p>{latestExpense ? formatCurrency(latestExpense.amount) : "等你录入第一笔支出"}</p>
        </article>
        <article className="insight-card animated-rise delay-4">
          <div className="insight-header">
            <BalanceIcon />
            <span>现金感受</span>
          </div>
          <strong>{monthBalance >= 0 ? "正向积累" : "本月超支"}</strong>
          <p>结余 {formatCurrency(monthBalance)}</p>
        </article>
      </section>
    </div>
  );
}

function TransactionFormPage({
  title,
  description,
  onSubmit
}: {
  title: string;
  description: string;
  onSubmit: (payload: TransactionPayload) => Promise<void>;
}) {
  return (
    <section className="single-panel-page">
      <div className="panel-header vertical">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <TransactionForm title={title} onSubmit={onSubmit} />
    </section>
  );
}

function TransactionForm({
  title,
  compact = false,
  initialValue,
  submitLabel = "保存记录",
  onSubmit,
  onCancel
}: {
  title: string;
  compact?: boolean;
  initialValue?: TransactionRecord;
  submitLabel?: string;
  onSubmit: (payload: TransactionPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const [type, setType] = useState<TransactionType>(initialValue?.type ?? "expense");
  const [amount, setAmount] = useState(initialValue ? initialValue.amount.toString() : "");
  const [transactionDate, setTransactionDate] = useState(
    initialValue?.transactionDate ?? getTodayDate()
  );
  const initialGroups = getCategoryGroups(initialValue?.type ?? "expense");
  const [categoryLevel1, setCategoryLevel1] = useState(
    initialValue?.categoryLevel1 ?? initialGroups[0].level1
  );
  const [categoryLevel2, setCategoryLevel2] = useState(
    initialValue?.categoryLevel2 ?? initialGroups[0].level2[0]
  );
  const [note, setNote] = useState(initialValue?.note ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryGroups = getCategoryGroups(type);
  const currentGroup =
    categoryGroups.find((item) => item.level1 === categoryLevel1) ?? categoryGroups[0];

  useEffect(() => {
    if (initialValue) {
      setType(initialValue.type);
      setAmount(initialValue.amount.toString());
      setTransactionDate(initialValue.transactionDate);
      setCategoryLevel1(initialValue.categoryLevel1);
      setCategoryLevel2(initialValue.categoryLevel2);
      setNote(initialValue.note);
    }
  }, [initialValue]);

  useEffect(() => {
    const groups = getCategoryGroups(type);
    const firstGroup = groups[0];
    if (!groups.some((item) => item.level1 === categoryLevel1)) {
      setCategoryLevel1(firstGroup.level1);
      setCategoryLevel2(firstGroup.level2[0]);
      return;
    }

    const matched = groups.find((item) => item.level1 === categoryLevel1) ?? firstGroup;
    if (!matched.level2.includes(categoryLevel2)) {
      setCategoryLevel2(matched.level2[0]);
    }
  }, [type, categoryLevel1, categoryLevel2]);

  async function submit() {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        amount: parsedAmount,
        transactionDate,
        categoryLevel1,
        categoryLevel2,
        note
      });

      if (!initialValue) {
        const resetGroups = getCategoryGroups("expense");
        setType("expense");
        setAmount("");
        setTransactionDate(getTodayDate());
        setCategoryLevel1(resetGroups[0].level1);
        setCategoryLevel2(resetGroups[0].level2[0]);
        setNote("");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`form-card animated-rise${compact ? " compact" : ""}`}>
      <SectionTitle
        title={title}
        caption="现在支持收入和支出两种记录"
        icon={<SparkIcon />}
      />
      <div className="type-switch">
        <button
          className={`type-chip${type === "expense" ? " active expense" : ""}`}
          onClick={() => {
            const nextGroups = getCategoryGroups("expense");
            setType("expense");
            setCategoryLevel1(nextGroups[0].level1);
            setCategoryLevel2(nextGroups[0].level2[0]);
          }}
          type="button"
        >
          <ExpenseIcon />
          支出
        </button>
        <button
          className={`type-chip${type === "income" ? " active income" : ""}`}
          onClick={() => {
            const nextGroups = getCategoryGroups("income");
            setType("income");
            setCategoryLevel1(nextGroups[0].level1);
            setCategoryLevel2(nextGroups[0].level2[0]);
          }}
          type="button"
        >
          <IncomeIcon />
          收入
        </button>
      </div>

      <div className="form-grid">
        <label>
          <span>金额（元）</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="例如 88.00"
          />
        </label>
        <label>
          <span>日期</span>
          <input
            type="date"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
          />
        </label>
        <label>
          <span>一级分类</span>
          <select
            value={categoryLevel1}
            onChange={(event) => {
              const nextLevel1 = event.target.value;
              const nextGroup =
                categoryGroups.find((item) => item.level1 === nextLevel1) ?? categoryGroups[0];
              setCategoryLevel1(nextLevel1);
              setCategoryLevel2(nextGroup.level2[0]);
            }}
          >
            {categoryGroups.map((item) => (
              <option key={item.level1} value={item.level1}>
                {item.level1}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>二级分类</span>
          <select
            value={categoryLevel2}
            onChange={(event) => setCategoryLevel2(event.target.value)}
          >
            {currentGroup.level2.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="full-width">
          <span>备注</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={compact ? 3 : 4}
            placeholder={type === "income" ? "例如：7 月工资到账" : "例如：午饭、打车、买药"}
          />
        </label>
      </div>
      <div className="action-row">
        {onCancel ? (
          <button className="ghost-button" onClick={onCancel} disabled={isSubmitting}>
            取消
          </button>
        ) : null}
        <button className="primary-button large-button" onClick={() => void submit()} disabled={isSubmitting}>
          <CheckIcon />
          {isSubmitting ? "保存中..." : submitLabel}
        </button>
      </div>
    </div>
  );
}

function TransactionListPage({
  transactions,
  selectedId,
  selectedTransaction,
  onSelect,
  onDelete,
  onUpdate
}: {
  transactions: TransactionRecord[];
  selectedId: number | null;
  selectedTransaction?: TransactionRecord;
  onSelect: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, payload: TransactionPayload) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");

  useEffect(() => {
    setIsEditing(false);
  }, [selectedId]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const typeMatched = typeFilter === "all" || item.type === typeFilter;
      const keywordMatched =
        keyword.trim() === "" ||
        item.categoryLevel1.includes(keyword) ||
        item.categoryLevel2.includes(keyword) ||
        item.note.includes(keyword);
      return typeMatched && keywordMatched;
    });
  }, [transactions, typeFilter, keyword]);

  return (
    <section className="list-layout">
      <article className="panel animated-rise">
        <SectionTitle
          title="收支明细"
          caption="可以筛选收入或支出，也能在这里直接编辑"
          icon={<ListIcon />}
        />
        <div className="filter-bar">
          <input
            placeholder="搜索分类或备注"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | TransactionType)}
          >
            <option value="all">全部类型</option>
            <option value="expense">只看支出</option>
            <option value="income">只看收入</option>
          </select>
          <input type="date" defaultValue={getTodayDate().slice(0, 8) + "01"} disabled />
          <input type="date" defaultValue={getTodayDate()} disabled />
        </div>
        <table className="expense-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>金额</th>
              <th>一级分类</th>
              <th>二级分类</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((item) => (
                <tr
                  key={item.id}
                  className={item.id === selectedId ? "selected" : ""}
                  onClick={() => onSelect(item.id)}
                >
                  <td>{item.transactionDate}</td>
                  <td>
                    <span className={`table-type ${item.type}`}>
                      {item.type === "income" ? <IncomeIcon /> : <ExpenseIcon />}
                      {item.type === "income" ? "收入" : "支出"}
                    </span>
                  </td>
                  <td className={item.type === "income" ? "income-text" : "expense-text"}>
                    {item.type === "income" ? "+" : "-"}
                    {formatCurrency(item.amount)}
                  </td>
                  <td>{item.categoryLevel1}</td>
                  <td>{item.categoryLevel2}</td>
                  <td>{item.note || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="table-empty-cell">
                  暂无符合条件的记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      <aside className="panel detail-panel animated-rise delay-2">
        <SectionTitle
          title="记录详情"
          caption="点击一条记录后，在这里查看或编辑"
          icon={<InfoIcon />}
        />
        {selectedTransaction ? (
          isEditing ? (
            <TransactionForm
              title="编辑记录"
              initialValue={selectedTransaction}
              submitLabel="保存修改"
              onSubmit={async (payload) => {
                await onUpdate(selectedTransaction.id, payload);
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              <dl className="detail-grid">
                <div>
                  <dt>编号</dt>
                  <dd>{selectedTransaction.id}</dd>
                </div>
                <div>
                  <dt>类型</dt>
                  <dd className={selectedTransaction.type === "income" ? "income-text" : "expense-text"}>
                    {selectedTransaction.type === "income" ? "收入" : "支出"}
                  </dd>
                </div>
                <div>
                  <dt>金额</dt>
                  <dd>{formatCurrency(selectedTransaction.amount)}</dd>
                </div>
                <div>
                  <dt>日期</dt>
                  <dd>{selectedTransaction.transactionDate}</dd>
                </div>
                <div>
                  <dt>一级分类</dt>
                  <dd>{selectedTransaction.categoryLevel1}</dd>
                </div>
                <div>
                  <dt>二级分类</dt>
                  <dd>{selectedTransaction.categoryLevel2}</dd>
                </div>
                <div className="full-width">
                  <dt>备注</dt>
                  <dd>{selectedTransaction.note || "暂无备注"}</dd>
                </div>
              </dl>
              <div className="action-row align-start">
                <button className="ghost-button" onClick={() => setIsEditing(true)}>
                  <EditIcon />
                  编辑
                </button>
                <button className="danger-button" onClick={() => void onDelete(selectedTransaction.id)}>
                  <TrashIcon />
                  删除
                </button>
              </div>
            </>
          )
        ) : (
          <p className="empty-copy">当前没有可展示的记录。</p>
        )}
      </aside>
    </section>
  );
}

function StatsPage({
  monthExpense,
  monthIncome,
  expenseSummary,
  incomeSummary
}: {
  monthExpense: number;
  monthIncome: number;
  expenseSummary: { name: string; amount: number }[];
  incomeSummary: { name: string; amount: number }[];
}) {
  const chartData = expenseSummary.length > 0 ? expenseSummary : incomeSummary;

  return (
    <section className="stack-page">
      <div className="panel animated-rise">
        <SectionTitle
          title="收支统计"
          caption="用图表和图标把本月的收支结构讲清楚"
          icon={<ChartIcon />}
        />

        <section className="stats-grid">
          <MetricCard label="本月收入" value={formatCurrency(monthIncome)} accent="income" icon={<IncomeIcon />} />
          <MetricCard label="本月支出" value={formatCurrency(monthExpense)} accent="expense" icon={<ExpenseIcon />} />
          <MetricCard
            label="本月结余"
            value={formatCurrency(monthIncome - monthExpense)}
            accent="balance"
            icon={<BalanceIcon />}
          />
        </section>
      </div>

      <section className="dashboard-grid">
        <article className="panel chart-panel animated-rise delay-1">
          <SectionTitle
            title="分类占比"
            caption={expenseSummary.length > 0 ? "当前展示支出图表" : "当前展示收入图表"}
            icon={<ChartIcon />}
          />
          <div className="chart-box">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={96}
                  >
                    {chartData.map((item, index) => (
                      <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="empty-copy">新增收支记录后，这里会自动生成分类图表。</p>
            )}
          </div>
        </article>

        <article className="panel animated-rise delay-2">
          <SectionTitle
            title="分类金额列表"
            caption="收入和支出分别汇总"
            icon={<CategoryIcon />}
          />
          <div className="summary-section">
            <h4>
              <ExpenseIcon />
              支出分类
            </h4>
            <div className="summary-list">
              {expenseSummary.length > 0 ? (
                expenseSummary.map((item) => (
                  <div key={item.name} className="summary-row">
                    <span>{item.name}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                ))
              ) : (
                <p className="empty-copy">暂无支出统计。</p>
              )}
            </div>
          </div>
          <div className="summary-section">
            <h4>
              <IncomeIcon />
              收入分类
            </h4>
            <div className="summary-list">
              {incomeSummary.length > 0 ? (
                incomeSummary.map((item) => (
                  <div key={item.name} className="summary-row">
                    <span>{item.name}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                ))
              ) : (
                <p className="empty-copy">暂无收入统计。</p>
              )}
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}

function SectionTitle({
  title,
  caption,
  icon
}: {
  title: string;
  caption: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="panel-header">
      <div className="section-title">
        <span className="section-icon">{icon}</span>
        <div>
          <h3>{title}</h3>
          <p>{caption}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return <span className="status-pill">{label}</span>;
}

function MetricCard({
  label,
  value,
  icon,
  accent = "default"
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: "default" | "income" | "expense" | "balance";
}) {
  return (
    <article className={`metric-card metric-card-${accent} animated-rise`}>
      <div className="metric-head">
        <span className="metric-icon">{icon}</span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </article>
  );
}

function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function WalletIcon() {
  return (
    <IconBase>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5V8h1.5A1.5 1.5 0 0 1 22 9.5v7a1.5 1.5 0 0 1-1.5 1.5H19v.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 3 18.5z" />
      <path d="M19 12h3" />
      <circle cx="17" cy="12" r="1" />
    </IconBase>
  );
}

function PlusIcon() {
  return (
    <IconBase>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

function SparkIcon() {
  return (
    <IconBase>
      <path d="m12 3 1.7 4.8L18.5 9l-4.8 1.3L12 15l-1.7-4.7L5.5 9l4.8-1.2z" />
    </IconBase>
  );
}

function ClockIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3.5 2" />
    </IconBase>
  );
}

function IncomeIcon() {
  return (
    <IconBase>
      <path d="M12 19V5" />
      <path d="m7 10 5-5 5 5" />
    </IconBase>
  );
}

function ExpenseIcon() {
  return (
    <IconBase>
      <path d="M12 5v14" />
      <path d="m17 14-5 5-5-5" />
    </IconBase>
  );
}

function BalanceIcon() {
  return (
    <IconBase>
      <path d="M4 8h16" />
      <path d="M6.5 8 9 5.5 11.5 8" />
      <path d="M17.5 16 15 18.5 12.5 16" />
      <path d="M4 16h16" />
    </IconBase>
  );
}

function TrendUpIcon() {
  return (
    <IconBase>
      <path d="m4 16 5-5 4 4 7-8" />
      <path d="M15 7h5v5" />
    </IconBase>
  );
}

function TrendDownIcon() {
  return (
    <IconBase>
      <path d="m4 8 5 5 4-4 7 8" />
      <path d="M15 17h5v-5" />
    </IconBase>
  );
}

function ListIcon() {
  return (
    <IconBase>
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </IconBase>
  );
}

function CategoryIcon() {
  return (
    <IconBase>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </IconBase>
  );
}

function InfoIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11.5v4" />
      <path d="M12 8.5h.01" />
    </IconBase>
  );
}

function EditIcon() {
  return (
    <IconBase>
      <path d="M4 20h4l10-10-4-4L4 16z" />
      <path d="m12 6 4 4" />
    </IconBase>
  );
}

function TrashIcon() {
  return (
    <IconBase>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7v12h10V7" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </IconBase>
  );
}

function CheckIcon() {
  return (
    <IconBase>
      <path d="m5 12 4 4L19 6" />
    </IconBase>
  );
}

function ChartIcon() {
  return (
    <IconBase>
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-8" />
    </IconBase>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return `${fallback}：${error.message}`;
  }
  if (typeof error === "string" && error.length > 0) {
    return `${fallback}：${error}`;
  }
  return fallback;
}

export default App;
