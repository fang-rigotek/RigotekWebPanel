// src/db.rs
use redb::Database;
use std::path::Path;

/// 初始化 redb 数据库（最小化版）
pub fn init_db(path: &str) -> Database {
    let db_path = Path::new(path);
    Database::create(db_path).expect("failed to create or open redb database")
}
