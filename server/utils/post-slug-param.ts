import type { H3Event } from "h3";
import { getRequestURL, getRouterParam } from "h3";

/** 从 API 路径或 catch-all 路由参数解析文章 slug（支持 aaaa/bbb） */
export function resolvePostSlugFromEvent(
  event: H3Event,
  apiPrefix: string,
): string {
  const path = getRequestURL(event).pathname;
  const idx = path.indexOf(apiPrefix);
  if (idx >= 0) {
    const segment = path.slice(idx + apiPrefix.length).replace(/\/+$/, "");
    if (segment) {
      try {
        return decodeURIComponent(segment).trim();
      } catch {
        return segment.trim();
      }
    }
  }

  const param = getRouterParam(event, "slug");
  if (Array.isArray(param)) {
    return param.map((s) => decodeURIComponent(String(s))).join("/").trim();
  }
  if (param != null) {
    const s = String(param).trim();
    try {
      return decodeURIComponent(s).trim();
    } catch {
      return s;
    }
  }
  return "";
}

const ADMIN_POSTS_API_PREFIX = "/api/posts/";

/** 后台文章 API：支持路径型 slug（aaaa/bbb 以 encode 单段出现在 URL） */
export function resolveAdminPostSlugFromEvent(event: H3Event): string {
  return resolvePostSlugFromEvent(event, ADMIN_POSTS_API_PREFIX);
}
