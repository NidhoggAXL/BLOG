export interface SiteProfile {
  name: string;
  bio: string;
  avatar: string;
  githubUrl: string | null;
  githubUsername: string;
  giteeUrl: string | null;
  email: string | null;
}

type PublicSiteProfileApi = {
  username: string;
  displayName: string | null;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  githubUrl: string | null;
  giteeUrl: string | null;
};

const FALLBACK: SiteProfile = {
  name: "NidhoggAXL",
  bio: "有道无术，术尚可求也；有术无道，止与术。",
  avatar: "https://github.com/NidhoggAXL.png",
  githubUrl: "https://github.com/NidhoggAXL",
  githubUsername: "NidhoggAXL",
  giteeUrl: null,
  email: null,
};

function githubUsernameFromUrl(url: string | null | undefined): string {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  try {
    const path = new URL(raw).pathname.replace(/^\/+|\/+$/g, "");
    return path.split("/")[0] ?? "";
  } catch {
    return "";
  }
}

function mapApiToProfile(api: PublicSiteProfileApi | null): SiteProfile {
  if (!api?.username && !api?.displayName) {
    return { ...FALLBACK };
  }
  const githubUrl = api.githubUrl?.trim() || null;
  const githubUsername =
    githubUsernameFromUrl(githubUrl) || api.username || FALLBACK.githubUsername;

  return {
    name: api.displayName?.trim() || api.username || FALLBACK.name,
    bio: api.bio?.trim() || FALLBACK.bio,
    avatar: api.avatarUrl?.trim() || FALLBACK.avatar,
    githubUrl,
    githubUsername,
    giteeUrl: api.giteeUrl?.trim() || null,
    email: api.email?.trim() || null,
  };
}

export function useSiteProfile() {
  const { data } = useFetch<PublicSiteProfileApi>("/api/public/site-profile", {
    key: "public-site-profile",
    default: () => null,
  });

  const profile = computed<SiteProfile>(() => mapApiToProfile(data.value));

  return { profile };
}
