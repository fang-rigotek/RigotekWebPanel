// src/main.rs
// rigotek_panel 后端入口文件，启动 HTTP 服务并注册最小路由。

mod config;
mod db;

use axum::{routing::get, Router};
use std::net::SocketAddr;
use tokio::net::TcpListener;
use config::Config;
use db::init_db;

/// main 函数：创建并启动异步多线程运行时，绑定端口并运行服务。
#[tokio::main(flavor = "multi_thread")]
async fn main() {
    // 1. 加载配置（文件不存在 → 默认）
    let cfg = Config::load();

    // 2. 初始化 redb 数据库
    let _db = init_db(&cfg.database.path);
    println!("redb initialized at {}", cfg.database.path);

    // 3. 定义路由：GET /health 返回固定字符串
    let app = Router::new().route("/health", get(|| async { "ok" }));

    // 4. 启动 HTTP 服务（默认监听 127.0.0.1:<port>）
    let addr = SocketAddr::from(([127, 0, 0, 1], cfg.server.port));
    let listener = TcpListener::bind(addr).await.unwrap();
    println!("listening on http://{}", listener.local_addr().unwrap());

    axum::serve(listener, app).await.unwrap();
}
