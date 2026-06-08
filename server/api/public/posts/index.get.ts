import { publicPublishedCacheKey } from "../../../utils/public-published-cache-key";
import { listPublicPosts, requireMysqlFromEvent } from "../../../utils/posts";

export default defineCachedEventHandler(
  async (event) => {
    const { pool } = requireMysqlFromEvent(event);
    const list = await listPublicPosts(pool);
    return { list };
  },
  {
    maxAge: 20,
    staleMaxAge: 0,
    getKey: (event) => publicPublishedCacheKey(event, "public-posts-list"),
  },
);
