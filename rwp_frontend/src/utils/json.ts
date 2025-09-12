
// 只保留键值对中有数据的值
export function cleanData<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") {
      (result as any)[k] = v;
    }
  }
  return result;
}