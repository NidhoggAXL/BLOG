/** 将 JSZip 传入的文件名字节转为 Uint8Array */
function toUint8Array(bytes: string[] | Uint8Array | ArrayBuffer): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes)
  return Uint8Array.from(bytes as Iterable<number>)
}

/**
 * 解码 ZIP 条目文件名。
 * 中文 Windows 压缩包常用 GBK 且不设 UTF-8 标志，JSZip 默认 utf8decode 会导致目录名乱码。
 * 已设 UTF-8 标志的条目由 JSZip 自行处理，不会调用此函数。
 */
export function decodeZipEntryName(bytes: string[] | Uint8Array | ArrayBuffer): string {
  const u8 = toUint8Array(bytes)

  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(u8)
    if (utf8.length > 0) return utf8
  } catch {
    /* 非 UTF-8，常见于 GBK 压缩包 */
  }

  try {
    const gb = new TextDecoder('gb18030').decode(u8)
    if (gb.length > 0) return gb
  } catch {
    /* 极旧环境可能不支持 gb18030 */
  }

  return new TextDecoder('utf-8').decode(u8)
}
