#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod categories;

use std::{fs, path::PathBuf};

use categories::{
    create_custom_level1, create_custom_level2, delete_custom_level1, delete_custom_level2,
    initialize_categories, list_category_groups, rename_custom_level1, rename_custom_level2,
};
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TransactionRecord {
    id: i64,
    #[serde(rename = "type")]
    record_type: String,
    amount: f64,
    transaction_date: String,
    category_level1: String,
    category_level2: String,
    note: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TransactionPayload {
    #[serde(rename = "type")]
    record_type: String,
    amount: f64,
    transaction_date: String,
    category_level1: String,
    category_level2: String,
    note: String,
}

type AppResult<T> = Result<T, String>;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            initialize_database(&app.handle())?;
            initialize_categories(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_transactions,
            create_transaction,
            update_transaction,
            delete_transaction,
            list_category_groups,
            create_custom_level1,
            create_custom_level2,
            rename_custom_level1,
            rename_custom_level2,
            delete_custom_level1,
            delete_custom_level2
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn list_transactions(app: AppHandle) -> AppResult<Vec<TransactionRecord>> {
    let connection = open_connection(&app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, transaction_type, amount, transaction_date, category_level_1, category_level_2, note, created_at, updated_at
             FROM transactions
             ORDER BY transaction_date DESC, id DESC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(TransactionRecord {
                id: row.get(0)?,
                record_type: row.get(1)?,
                amount: row.get(2)?,
                transaction_date: row.get(3)?,
                category_level1: row.get(4)?,
                category_level2: row.get(5)?,
                note: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn create_transaction(app: AppHandle, payload: TransactionPayload) -> AppResult<TransactionRecord> {
    validate_payload(&payload)?;
    let connection = open_connection(&app)?;
    let now = Utc::now().to_rfc3339();

    connection
        .execute(
            "INSERT INTO transactions (transaction_type, amount, transaction_date, category_level_1, category_level_2, note, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                payload.record_type,
                payload.amount,
                payload.transaction_date,
                payload.category_level1,
                payload.category_level2,
                payload.note,
                now,
                now
            ],
        )
        .map_err(|error| error.to_string())?;

    get_transaction_by_id(&connection, connection.last_insert_rowid())
}

#[tauri::command]
fn update_transaction(
    app: AppHandle,
    id: i64,
    payload: TransactionPayload,
) -> AppResult<TransactionRecord> {
    validate_payload(&payload)?;
    let connection = open_connection(&app)?;
    let now = Utc::now().to_rfc3339();

    let affected = connection
        .execute(
            "UPDATE transactions
             SET transaction_type = ?1,
                 amount = ?2,
                 transaction_date = ?3,
                 category_level_1 = ?4,
                 category_level_2 = ?5,
                 note = ?6,
                 updated_at = ?7
             WHERE id = ?8",
            params![
                payload.record_type,
                payload.amount,
                payload.transaction_date,
                payload.category_level1,
                payload.category_level2,
                payload.note,
                now,
                id
            ],
        )
        .map_err(|error| error.to_string())?;

    if affected == 0 {
        return Err("未找到要更新的记录".into());
    }

    get_transaction_by_id(&connection, id)
}

#[tauri::command]
fn delete_transaction(app: AppHandle, id: i64) -> AppResult<()> {
    let connection = open_connection(&app)?;
    let affected = connection
        .execute("DELETE FROM transactions WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;

    if affected == 0 {
        return Err("未找到要删除的记录".into());
    }

    Ok(())
}

fn initialize_database(app: &AppHandle) -> AppResult<()> {
    let connection = open_connection(app)?;
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_type TEXT NOT NULL,
                amount REAL NOT NULL,
                transaction_date TEXT NOT NULL,
                category_level_1 TEXT NOT NULL,
                category_level_2 TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );",
        )
        .map_err(|error| error.to_string())?;

    let old_table_exists: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'expenses'",
            [],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;

    if old_table_exists > 0 {
        connection
            .execute(
                "INSERT INTO transactions (id, transaction_type, amount, transaction_date, category_level_1, category_level_2, note, created_at, updated_at)
                 SELECT id, 'expense', amount, expense_date, category_level_1, category_level_2, note, created_at, updated_at
                 FROM expenses
                 WHERE id NOT IN (SELECT id FROM transactions)",
                [],
            )
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub(crate) fn open_connection(app: &AppHandle) -> AppResult<Connection> {
    let database_path = database_path(app)?;
    let connection = Connection::open(database_path).map_err(|error| error.to_string())?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;
    Ok(connection)
}

fn database_path(app: &AppHandle) -> AppResult<PathBuf> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;

    fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    Ok(app_data_dir.join("daily-bookkeeping.sqlite"))
}

fn get_transaction_by_id(connection: &Connection, id: i64) -> AppResult<TransactionRecord> {
    connection
        .query_row(
            "SELECT id, transaction_type, amount, transaction_date, category_level_1, category_level_2, note, created_at, updated_at
             FROM transactions
             WHERE id = ?1",
            params![id],
            |row| {
                Ok(TransactionRecord {
                    id: row.get(0)?,
                    record_type: row.get(1)?,
                    amount: row.get(2)?,
                    transaction_date: row.get(3)?,
                    category_level1: row.get(4)?,
                    category_level2: row.get(5)?,
                    note: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .map_err(|error| error.to_string())
}

fn validate_payload(payload: &TransactionPayload) -> AppResult<()> {
    if payload.amount <= 0.0 {
        return Err("金额必须大于 0".into());
    }
    if payload.transaction_date.trim().is_empty() {
        return Err("日期不能为空".into());
    }
    if payload.record_type != "expense" && payload.record_type != "income" {
        return Err("记录类型不合法".into());
    }
    if payload.category_level1.trim().is_empty() || payload.category_level2.trim().is_empty() {
        return Err("分类不能为空".into());
    }
    Ok(())
}
