import { buildGraphData } from "../../../utils/graph";
import { publicPublishedCacheKey } from "../../../utils/public-published-cache-key";
import { requireMysqlFromEvent } from "../../../utils/posts";

export default defineCachedEventHandler(
  async (event) => {
    const { pool } = requireMysqlFromEvent(event);
    const query = getQuery(event);
    const showOrphans =
      query.showOrphans !== "false" && query.show_orphans !== "false";

    return buildGraphData(pool, {
      showOrphans,
      publishedOnly: true,
    });
  },
  {
    maxAge: 30,
    staleMaxAge: 0,
    getKey: (event) => publicPublishedCacheKey(event, "public-graph"),
  },
);
