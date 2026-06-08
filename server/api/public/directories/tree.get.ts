import { listPublicDirectories } from "../../../utils/directories";
import { publicCatalogCacheKey } from "../../../utils/public-catalog-cache-key";
import { requireMysqlFromEvent } from "../../../utils/posts";

export default defineCachedEventHandler(
  async (event) => {
    const { pool } = requireMysqlFromEvent(event);
    const list = await listPublicDirectories(pool);
    return { list };
  },
  {
    maxAge: 20,
    staleMaxAge: 0,
    getKey: (event) => publicCatalogCacheKey(event, "public-directories-tree"),
  },
);
