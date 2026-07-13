import type { CategoryGroup, CategorySource, TransactionType } from "./types";

type SeedGroup = {
  level1: string;
  level2: string[];
};

export const expenseCategorySeeds: SeedGroup[] = [
  { level1: "餐饮", level2: ["早餐", "午餐", "晚餐", "饮料奶茶", "零食", "聚餐", "外卖"] },
  { level1: "交通", level2: ["公交地铁", "打车", "加油", "停车费", "火车高铁"] },
  { level1: "居家生活", level2: ["房租", "水费", "电费", "日用品", "家居用品"] },
  { level1: "购物消费", level2: ["服饰鞋包", "数码产品", "美妆护肤", "网购其他"] },
  { level1: "医疗健康", level2: ["买药", "挂号问诊", "体检", "健身运动"] },
  { level1: "学习成长", level2: ["课程培训", "书籍资料", "软件订阅"] },
  { level1: "娱乐社交", level2: ["电影演出", "游戏充值", "旅游娱乐", "礼物红包"] },
  { level1: "其他支出", level2: ["手续费", "临时支出", "未分类"] }
];

export const incomeCategorySeeds: SeedGroup[] = [
  { level1: "工资收入", level2: ["月工资", "奖金", "补贴", "年终奖"] },
  { level1: "副业收入", level2: ["兼职", "咨询服务", "项目收入", "稿费"] },
  { level1: "生意收入", level2: ["销售收款", "客户回款", "经营分红"] },
  { level1: "投资收入", level2: ["利息", "基金收益", "股票收益", "分红"] },
  { level1: "生活入账", level2: ["红包", "转账收款", "退款", "报销"] },
  { level1: "其他收入", level2: ["临时收入", "其他入账"] }
];

function buildSystemGroups(
  type: TransactionType,
  seeds: SeedGroup[],
  startLevel1Id: number
) {
  let nextLevel1Id = startLevel1Id;
  let nextLevel2Id = startLevel1Id * 100;

  return seeds.map((group) => {
    const result: CategoryGroup = {
      level1Id: nextLevel1Id++,
      level1: group.level1,
      level1Source: "system" satisfies CategorySource,
      type,
      level2Items: group.level2.map((name) => ({
        id: nextLevel2Id++,
        name,
        source: "system" satisfies CategorySource
      }))
    };
    return result;
  });
}

export const expenseCategoryGroups = buildSystemGroups("expense", expenseCategorySeeds, 1);
export const incomeCategoryGroups = buildSystemGroups("income", incomeCategorySeeds, 1000);

export const getSystemCategoryGroups = (type: TransactionType) =>
  type === "income" ? incomeCategoryGroups : expenseCategoryGroups;
