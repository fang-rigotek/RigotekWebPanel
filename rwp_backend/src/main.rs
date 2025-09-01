// src/main.rs
// rwp_backend 的入口文件，启动 HTTP 服务并注册最小路由。

use axum::{routing::get, Router};
use std::net::SocketAddr;
use tokio::net::TcpListener;

/// main 函数：创建并启动异步多线程运行时，绑定端口并运行服务。
#[tokio::main(flavor = "multi_thread")]
async fn main() {
    // 定义路由：GET / 返回固定字符串
    let app = Router::new().route("/health", get(|| async { "ok" }));

    // 监听地址：本地 11082 端口
    let addr = SocketAddr::from(([127, 0, 0, 1], 11082));
    let listener = TcpListener::bind(addr).await.unwrap();
    println!("listening on http://{}", listener.local_addr().unwrap());

    // 启动服务并开始监听请求
    axum::serve(listener, app).await.unwrap();
}
