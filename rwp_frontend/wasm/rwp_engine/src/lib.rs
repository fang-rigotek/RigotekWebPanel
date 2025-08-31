use wasm_bindgen::prelude::*;
use std::arch::wasm32::{i32x4_add, i32x4_extract_lane, i32x4_splat};

/// 内部：检测 SIMD
fn check_simd() -> bool {
    let a = i32x4_splat(1);
    let b = i32x4_splat(2);
    let r = i32x4_add(a, b);
    let lane0 = i32x4_extract_lane::<0>(r);
    lane0 == 3
}

/// 对外：统一的“特征检测”接口（当前仅检测 SIMD）
#[wasm_bindgen]
pub fn check_wasm_feature() -> bool {
    check_simd()
}