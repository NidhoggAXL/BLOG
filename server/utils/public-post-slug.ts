import type { H3Event } from "h3";
import { resolvePostSlugFromEvent } from "./post-slug-param";

const API_PREFIX = "/api/public/posts/";

/** 从请求路径解析 slug，避免动态路由参数在部分 Unicode slug 下与缓存键不一致 */
export function resolvePublicPostSlug(event: H3Event): string {
  return resolvePostSlugFromEvent(event, API_PREFIX);
}

export function publicPostCacheKey(event: H3Event): string {
  return `public-post:${encodeURIComponent(resolvePublicPostSlug(event))}`;
}
