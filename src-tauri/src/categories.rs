use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::{open_connection, AppResult};

const EXPENSE_SYSTEM_CATEGORIES: &[(&str, &[&str])] = &[
    ("餐饮", &["早餐", "午餐", "晚餐", "饮料奶茶", "零食", "聚餐", "外卖"]),
    ("交通", &["公交地铁", "打车", "加油", "停车费", "火车高铁"]),
    ("居家生活", &["房租", "水费", "电费", "日用品", "家居用品"]),
    ("购物消费", &["服饰鞋包", "数码产品", "美妆护肤", "网购其他"]),
    ("医疗健康", &["买药", "挂号问诊", "体检", "健身运动"]),
    ("学习成长", &["课程培训", "书籍资料", "软件订阅"]),
    ("娱乐社交", &["电影演出", "游戏充值", "旅游娱乐", "礼物红包"]),
    ("其他支出", &["手续费", "临时支出", "未分类"]),
];

const INCOME_SYSTEM_CATEGORIES: &[(&str, &[&str])] = &[
    ("工资收入", &["月工资", "奖金", "补贴", "年终奖"]),
    ("副业收入", &["兼职", "咨询服务", "项目收入", "稿费"]),
    ("生意收入", &["销售收款", "客户回款", "经营分红"]),
    ("投资收入", &["利息", "基金收益", "股票收益", "分红"]),
    ("生活入账", &["红包", "转账收款", "退款", "报销"]),
    ("其他收入", &["临时收入", "其他入账"]),
];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryLevel2 {
    pub id: i64,
    pub name: String,
    pub source: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryGroup {
    pub level1_id: i64,
    pub level1: String,
    pub level1_source: String,
    #[serde(rename = "type")]
    pub record_type: String,
    pub level2_items: Vec<CategoryLevel2>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCustomLevel1Payload {
    #[serde(rename = "type")]
    pub record_type: String,
    pub level1_name: String,
    pub initial_level2_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCustomLevel2Payload {
    pub level1_id: i64,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameCustomLevel1Payload {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameCustomLevel2Payload {
    pub id: i64,
    pub name: String,
}

struct Level1Row {
    id: i64,
    record_type: String,
    name: String,
    source: String,
}

struct Level2Row {
    id: i64,
    level1_id: i64,
    level1_name: String,
    record_type: String,
    name: String,
    source: String,
}

pub fn initialize_categories(app: &AppHandle) -> AppResult<()> {
    let connection = open_connection(app)?;
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS category_level1 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_type TEXT NOT NULL,
                name TEXT NOT NULL,
                source TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(transaction_type, name)
            );
            CREATE TABLE IF NOT EXISTS category_level2 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level1_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                source TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(level1_id, name),
                FOREIGN KEY(level1_id) REFERENCES category_level1(id) ON DELETE CASCADE
            );",
        )
        .map_err(|error| error.to_string())?;

    seed_system_categories(&connection, "expense", EXPENSE_SYSTEM_CATEGORIES)?;
    seed_system_categories(&connection, "income", INCOME_SYSTEM_CATEGORIES)?;

    Ok(())
}

#[tauri::command]
pub fn list_category_groups(app: AppHandle, record_type: String) -> AppResult<Vec<CategoryGroup>> {
    let connection = open_connection(&app)?;
    list_category_groups_by_type(&connection, &record_type)
}

#[tauri::command]
pub fn create_custom_level1(
    app: AppHandle,
    payload: CreateCustomLevel1Payload,
) -> AppResult<CategoryGroup> {
    validate_record_type(&payload.record_type)?;
    let level1_name = normalize_name(&payload.level1_name)?;
    let initial_level2_name = normalize_name(&payload.initial_level2_name)?;
    let connection = open_connection(&app)?;
    let now = Utc::now().to_rfc3339();

    connection
        .execute(
            "INSERT INTO category_level1 (transaction_type, name, source, created_at, updated_at)
             VALUES (?1, ?2, 'custom', ?3, ?4)",
            params![payload.record_type, level1_name, now, now],
        )
        .map_err(map_category_error)?;

    let level1_id = connection.last_insert_rowid();
    connection
        .execute(
            "INSERT INTO category_level2 (level1_id, name, source, created_at, updated_at)
             VALUES (?1, ?2, 'custom', ?3, ?4)",
            params![level1_id, initial_level2_name, now, now],
        )
        .map_err(map_category_error)?;

    get_category_group(&connection, level1_id)
}

#[tauri::command]
pub fn create_custom_level2(
    app: AppHandle,
    payload: CreateCustomLevel2Payload,
) -> AppResult<CategoryGroup> {
    let name = normalize_name(&payload.name)?;
    let connection = open_connection(&app)?;
    let level1 = get_level1_row(&connection, payload.level1_id)?;
    let now = Utc::now().to_rfc3339();

    connection
        .execute(
            "INSERT INTO category_level2 (level1_id, name, source, created_at, updated_at)
             VALUES (?1, ?2, 'custom', ?3, ?4)",
            params![level1.id, name, now, now],
        )
        .map_err(map_category_error)?;

    get_category_group(&connection, level1.id)
}

#[tauri::command]
pub fn rename_custom_level1(
    app: AppHandle,
    payload: RenameCustomLevel1Payload,
) -> AppResult<CategoryGroup> {
    let next_name = normalize_name(&payload.name)?;
    let connection = open_connection(&app)?;
    let level1 = get_level1_row(&connection, payload.id)?;

    if level1.source != "custom" {
        return Err("系统一级分类不能修改".into());
    }

    let now = Utc::now().to_rfc3339();
    connection
        .execute(
            "UPDATE category_level1 SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![next_name, now, level1.id],
        )
        .map_err(map_category_error)?;

    connection
        .execute(
            "UPDATE transactions
             SET category_level_1 = ?1, updated_at = ?2
             WHERE transaction_type = ?3 AND category_level_1 = ?4",
            params![next_name, now, level1.record_type, level1.name],
        )
        .map_err(|error| error.to_string())?;

    get_category_group(&connection, level1.id)
}

#[tauri::command]
pub fn rename_custom_level2(
    app: AppHandle,
    payload: RenameCustomLevel2Payload,
) -> AppResult<CategoryGroup> {
    let next_name = normalize_name(&payload.name)?;
    let connection = open_connection(&app)?;
    let level2 = get_level2_row(&connection, payload.id)?;

    if level2.source != "custom" {
        return Err("系统二级分类不能修改".into());
    }

    let now = Utc::now().to_rfc3339();
    connection
        .execute(
            "UPDATE category_level2 SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![next_name, now, level2.id],
        )
        .map_err(map_category_error)?;

    connection
        .execute(
            "UPDATE transactions
             SET category_level_2 = ?1, updated_at = ?2
             WHERE transaction_type = ?3 AND category_level_1 = ?4 AND category_level_2 = ?5",
            params![
                next_name,
                now,
                level2.record_type,
                level2.level1_name,
                level2.name
            ],
        )
        .map_err(|error| error.to_string())?;

    get_category_group(&connection, level2.level1_id)
}

#[tauri::command]
pub fn delete_custom_level1(app: AppHandle, id: i64) -> AppResult<()> {
    let connection = open_connection(&app)?;
    let level1 = get_level1_row(&connection, id)?;
    if level1.source != "custom" {
        return Err("系统一级分类不能删除".into());
    }

    connection
        .execute("DELETE FROM category_level1 WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_custom_level2(app: AppHandle, id: i64) -> AppResult<()> {
    let connection = open_connection(&app)?;
    let level2 = get_level2_row(&connection, id)?;
    if level2.source != "custom" {
        return Err("系统二级分类不能删除".into());
    }

    connection
        .execute("DELETE FROM category_level2 WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn seed_system_categories(
    connection: &Connection,
    record_type: &str,
    seeds: &[(&str, &[&str])],
) -> AppResult<()> {
    for (level1_name, level2_names) in seeds {
        let level1_id = ensure_system_level1(connection, record_type, level1_name)?;
        for level2_name in *level2_names {
            ensure_system_level2(connection, level1_id, level2_name)?;
        }
    }
    Ok(())
}

fn ensure_system_level1(connection: &Connection, record_type: &str, name: &str) -> AppResult<i64> {
    let existing = connection
        .query_row(
            "SELECT id FROM category_level1 WHERE transaction_type = ?1 AND name = ?2",
            params![record_type, name],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    if let Some(id) = existing {
        return Ok(id);
    }

    let now = Utc::now().to_rfc3339();
    connection
        .execute(
            "INSERT INTO category_level1 (transaction_type, name, source, created_at, updated_at)
             VALUES (?1, ?2, 'system', ?3, ?4)",
            params![record_type, name, now, now],
        )
        .map_err(|error| error.to_string())?;

    Ok(connection.last_insert_rowid())
}

fn ensure_system_level2(connection: &Connection, level1_id: i64, name: &str) -> AppResult<()> {
    let existing: Option<i64> = connection
        .query_row(
            "SELECT id FROM category_level2 WHERE level1_id = ?1 AND name = ?2",
            params![level1_id, name],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    if existing.is_some() {
        return Ok(());
    }

    let now = Utc::now().to_rfc3339();
    connection
        .execute(
            "INSERT INTO category_level2 (level1_id, name, source, created_at, updated_at)
             VALUES (?1, ?2, 'system', ?3, ?4)",
            params![level1_id, name, now, now],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn list_category_groups_by_type(
    connection: &Connection,
    record_type: &str,
) -> AppResult<Vec<CategoryGroup>> {
    validate_record_type(record_type)?;

    let mut level1_statement = connection
        .prepare(
            "SELECT id, transaction_type, name, source
             FROM category_level1
             WHERE transaction_type = ?1
             ORDER BY source ASC, id ASC",
        )
        .map_err(|error| error.to_string())?;

    let level1_rows = level1_statement
        .query_map(params![record_type], |row| {
            Ok(Level1Row {
                id: row.get(0)?,
                record_type: row.get(1)?,
                name: row.get(2)?,
                source: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;

    let mut groups = Vec::new();
    for row in level1_rows {
        let row = row.map_err(|error| error.to_string())?;
        groups.push(get_category_group(connection, row.id)?);
    }

    Ok(groups)
}

fn get_category_group(connection: &Connection, level1_id: i64) -> AppResult<CategoryGroup> {
    let level1 = get_level1_row(connection, level1_id)?;

    let mut statement = connection
        .prepare(
            "SELECT id, name, source
             FROM category_level2
             WHERE level1_id = ?1
             ORDER BY source ASC, id ASC",
        )
        .map_err(|error| error.to_string())?;

    let level2_rows = statement
        .query_map(params![level1_id], |row| {
            Ok(CategoryLevel2 {
                id: row.get(0)?,
                name: row.get(1)?,
                source: row.get(2)?,
            })
        })
        .map_err(|error| error.to_string())?;

    let mut level2_items = Vec::new();
    for row in level2_rows {
        level2_items.push(row.map_err(|error| error.to_string())?);
    }

    Ok(CategoryGroup {
        level1_id: level1.id,
        level1: level1.name,
        level1_source: level1.source,
        record_type: level1.record_type,
        level2_items,
    })
}

fn get_level1_row(connection: &Connection, id: i64) -> AppResult<Level1Row> {
    connection
        .query_row(
            "SELECT id, transaction_type, name, source
             FROM category_level1
             WHERE id = ?1",
            params![id],
            |row| {
                Ok(Level1Row {
                    id: row.get(0)?,
                    record_type: row.get(1)?,
                    name: row.get(2)?,
                    source: row.get(3)?,
                })
            },
        )
        .map_err(|_| "未找到对应的一级分类".to_string())
}

fn get_level2_row(connection: &Connection, id: i64) -> AppResult<Level2Row> {
    connection
        .query_row(
            "SELECT l2.id, l2.level1_id, l1.name, l1.transaction_type, l2.name, l2.source
             FROM category_level2 l2
             INNER JOIN category_level1 l1 ON l1.id = l2.level1_id
             WHERE l2.id = ?1",
            params![id],
            |row| {
                Ok(Level2Row {
                    id: row.get(0)?,
                    level1_id: row.get(1)?,
                    level1_name: row.get(2)?,
                    record_type: row.get(3)?,
                    name: row.get(4)?,
                    source: row.get(5)?,
                })
            },
        )
        .map_err(|_| "未找到对应的二级分类".to_string())
}

fn normalize_name(name: &str) -> AppResult<String> {
    let value = name.trim();
    if value.is_empty() {
        return Err("分类名称不能为空".into());
    }
    Ok(value.to_string())
}

fn validate_record_type(record_type: &str) -> AppResult<()> {
    if record_type != "expense" && record_type != "income" {
        return Err("记录类型不合法".into());
    }
    Ok(())
}

fn map_category_error(error: rusqlite::Error) -> String {
    let message = error.to_string();
    if message.contains("UNIQUE constraint failed: category_level1") {
        return "该一级分类已存在".into();
    }
    if message.contains("UNIQUE constraint failed: category_level2") {
        return "该二级分类已存在".into();
    }
    message
}
