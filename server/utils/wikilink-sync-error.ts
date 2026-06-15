import { createError } from "h3";
import { WikilinkAmbiguousUnresolvedError } from "./wikilinks";

/** 若为未消歧双链错误则转为 HTTP 409 并抛出 */
export function rethrowIfWikilinkAmbiguous(e: unknown): void {
  if (e instanceof WikilinkAmbiguousUnresolvedError) {
    throw createError({
      statusCode: 409,
      message: e.message,
      data: { unresolved: e.unresolved },
    });
  }
}
