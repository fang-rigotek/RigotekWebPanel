// rwp_frontend/src/utils/storage.ts
// 封装浏览器 localStorage 的键值对读写操作

// 保存键值对到 localStorage（自动 JSON 序列化）
export function setItem<T>(key: string, value: T): { ok: boolean } {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return { ok: true };
    } catch (err) {
        console.error('[storage] setItem failed:', err);
        return { ok: false };
    }
}

// 从 localStorage 读取键值（自动 JSON 反序列化）
export function getItem<T>(key: string): { ok: boolean; value?: T } {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) {
            return { ok: false };
        }
        return { ok: true, value: JSON.parse(raw) as T };
    } catch (err) {
        console.error('[storage] getItem failed:', err);
        return { ok: false };
    }
}

// 删除 localStorage 中的某个键
export function removeItem(key: string): { ok: boolean } {
    try {
        localStorage.removeItem(key);
        return { ok: true };
    } catch (err) {
        console.error('[storage] removeItem failed:', err);
        return { ok: false };
    }
}

// 清空 localStorage 所有键值对
export function clearAll(): { ok: boolean } {
    try {
        localStorage.clear();
        return { ok: true };
    } catch (err) {
        console.error('[storage] clearAll failed:', err);
        return { ok: false };
    }
}
