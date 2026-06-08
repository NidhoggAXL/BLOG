import type { H3Event } from "h3";
import { getRequestURL, getRouterParam } from "h3";

const API_PREFIX = "/api/public/posts/";

/** 从请求路径解析 slug，避免动态路由参数在部分 Unicode slug 下与缓存键不一致 */
export function resolvePublicPostSlug(event: H3Event): string {
  const path = getRequestURL(event).pathname;
  const idx = path.indexOf(API_PREFIX);
  if (idx >= 0) {
    const segment = path.slice(idx + API_PREFIX.length);
    if (segment) {
      try {
        return decodeURIComponent(segment).trim();
      } catch {
        return segment.trim();
      }
    }
  }

  const param = getRouterParam(event, "slug");
  return param != null ? String(param).trim() : "";
}

export function publicPostCacheKey(event: H3Event): string {
  return `public-post:${encodeURIComponent(resolvePublicPostSlug(event))}`;
}
