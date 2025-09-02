// rwp_frontend/src/runtime/wasm.ts

// 存储每个包的初始化 Promise
const modPromises = new Map<string, Promise<any>>();
// 存储每个包的模块对象
const mods = new Map<string, any>();

/**
 * 启动 wasm 包的异步初始化（只会执行一次）
 */
export async function loadWasm(name: string) {
  if (!modPromises.has(name)) {
    const promise = (async () => {
    try {
      const mod = await import(`@wasm/${name}/pkg/${name}.js`);
      await mod.default();
      mods.set(name, mod);
    } catch (err) {
      // 失败时清理，避免下次永远拿到 rejected Promise
      modPromises.delete(name);
      throw err;
    }
    })();

    // 关键：在 import() 之前就把 Promise 放进 Map，防止并发重复初始化
    modPromises.set(name, promise);
    await promise;
  }
  return;
}

/**
 * 获取 wasm 模块（会等待初始化完成）
 * const engine = await getWasm("rwp_engine");
 * engine.run();
 */
export async function getWasm(name: string) {
  const promise = modPromises.get(name);
  if (!promise) {
    throw new Error(`Wasm module "${name}" not initialized. Call initWasm("${name}") first.`);
  }
  await promise;
  return mods.get(name)!;
}

// 如果包里加了 reset 支持，就能真正释放 wasm 实例
// 需要在 @wasm/${name}/pkg/${name}.js 末尾追加
// export function __wbg_reset() {
//   wasm = undefined;
//   __wbg_init.__wbindgen_wasm_module = undefined;
// }
export async function unloadWasm(name: string) {
  const mod = mods.get(name);
  if (mod) {
    if (typeof mod.__wbg_reset === 'function') {
      try { mod.__wbg_reset(); } catch { }
    }
    // 清理本地缓存
    mods.delete(name);
    modPromises.delete(name);
  }
}