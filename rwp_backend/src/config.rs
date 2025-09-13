// src/config.rs

use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server: Server,
    pub database: Database,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Server {
    pub port: u16,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Database {
    pub path: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server: Server { port: 11082 },
            database: Database { path: "data/rigotek_panel.db".into() },
        }
    }
}

impl Config {
    pub fn load() -> Self {
        match std::fs::read_to_string("config/config.toml") {
            Ok(text) => {
                toml::from_str(&text)
                    .unwrap_or_else(|e| panic!("Failed to parse config/config.toml: {e}"))
            }
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
                // 文件不存在 → 不是错误，直接用默认
                Self::default()
            }
            Err(err) => {
                // 其他读文件错误 → 报错
                panic!("Failed to read config/config.toml: {err}");
            }
        }
    }
}
