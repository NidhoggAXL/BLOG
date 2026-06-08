import { getPublicPostDetail, requireMysqlFromEvent } from "../../../utils/posts";
import { publicPublishedCacheKey } from "../../../utils/public-published-cache-key";
import {
  publicPostCacheKey,
  resolvePublicPostSlug,
} from "../../../utils/public-post-slug";

export default defineCachedEventHandler(
  async (event) => {
    const { config, pool } = requireMysqlFromEvent(event);
    const slug = resolvePublicPostSlug(event);
    if (!slug) {
      throw createError({ statusCode: 400, message: "缺少 slug" });
    }

    const detail = await getPublicPostDetail(
      pool,
      slug,
      config.publicWikilinkBasePath || "/blog",
    );
    if (!detail || detail.slug !== slug) {
      throw createError({ statusCode: 404, message: "文章不存在" });
    }

    return detail;
  },
  {
    maxAge: 20,
    staleMaxAge: 0,
    getKey: async (event) => {
      const revision = await publicPublishedCacheKey(event, "public-post");
      return `${revision}:${publicPostCacheKey(event)}`;
    },
  },
);
