import type { RowDataPacket } from "mysql2";
import { requireMysqlFromEvent } from "../../utils/posts";

type SiteOwnerRow = RowDataPacket & {
  username: string;
  display_name: string | null;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  github_url: string | null;
  gitee_url: string | null;
};

/** 前台顶栏展示：站点主账号（首个用户）的公开资料 */
export default defineEventHandler(async (event) => {
  const { pool } = requireMysqlFromEvent(event);
  const [rows] = await pool.query<SiteOwnerRow[]>(
    `SELECT username, display_name, email, bio, avatar_url, github_url, gitee_url
     FROM users
     ORDER BY id ASC
     LIMIT 1`,
  );
  const row = rows[0];
  if (!row) {
    return {
      username: "",
      displayName: null,
      email: null,
      bio: null,
      avatarUrl: null,
      githubUrl: null,
      giteeUrl: null,
    };
  }

  return {
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    githubUrl: row.github_url,
    giteeUrl: row.gitee_url,
  };
});
