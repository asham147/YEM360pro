"use client";
/**
 * YEM360 — root page: auth gate + app shell + view router.
 */
import { useCallback, useState } from "react";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import AppShell from "@/components/yem/shell";
import AuthView from "@/components/yem/auth";
import Feed from "@/components/yem/feed";
import ExploreView, { SearchView, TagView } from "@/components/yem/explore";
import ReelsView from "@/components/yem/reels";
import MessagesView from "@/components/yem/messages";
import ProfileView, { EditProfileDialog } from "@/components/yem/profile";
import SettingsView from "@/components/yem/settings";
import MarketView from "@/components/yem/market";
import AdsView from "@/components/yem/ads";
import ChannelsView from "@/components/yem/channels";
import AdminView from "@/components/yem/admin";
import { NotificationsView, InsightsView, MapView } from "@/components/yem/extras";
import { StoriesBar, StoryCreator, NoteComposer } from "@/components/yem/stories";
import { EmptyState, Spinner } from "@/components/yem/ui";
import { api } from "@/lib/api-client";
import { Radio } from "lucide-react";

export default function Page() {
  const lang = useApp((s) => s.lang);
  const user = useApp((s) => s.user);
  const route = useApp((s) => s.route);
  const navigate = useApp((s) => s.navigate);
  const [storyOpen, setStoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

  const onCreated = useCallback(() => setFeedKey((k) => k + 1), []);

  if (!user) return <AuthView />;

  function onCreate(kind: "post" | "story" | "reel" | "product" | "ad" | "channel") {
    switch (kind) {
      case "post":
        navigate({ name: "home" });
        setFeedKey((k) => k + 1);
        break;
      case "story":
        setStoryOpen(true);
        break;
      case "reel":
        navigate({ name: "reels" });
        break;
      case "product":
        navigate({ name: "market" });
        break;
      case "ad":
        navigate({ name: "ads" });
        break;
      case "channel":
        navigate({ name: "channels" });
        break;
    }
  }

  function view() {
    switch (route.name) {
      case "home":
        return (
          <Feed
            key={feedKey}
            refreshKey={feedKey}
            onCreateStory={() => setStoryOpen(true)}
            stories={
              <div className="mb-4 -mt-1">
                <StoriesBar onOpenCreate={() => setStoryOpen(true)} />
              </div>
            }
          />
        );
      case "explore":
        return <ExploreView />;
      case "search":
        return <SearchView />;
      case "tag":
        return <TagView tag={route.param || ""} />;
      case "reels":
        return <ReelsView onCreate={() => {}} />;
      case "messages":
        return <MessagesView key={route.param || "inbox"} initialConversation={route.param} />;
      case "notifications":
        return <NotificationsView />;
      case "profile":
        return (
          <ProfileView
            key={route.param || user?.username || ""}
            username={route.param || user?.username || ""}
            onEditProfile={() => setEditOpen(true)}
          />
        );
      case "settings":
        return <SettingsView />;
      case "market":
        return <MarketView />;
      case "ads":
        return <AdsView />;
      case "channels":
        return <ChannelsView key={route.param || "channels"} initialChannel={route.param} />;
      case "insights":
        return <InsightsView />;
      case "admin":
        return <AdminView />;
      case "map":
        return <MapView />;
      case "live":
        return (
          <div className="mx-auto max-w-xl px-3 py-10">
            <EmptyState
              icon={<Radio size={22} />}
              title={t("coming_soon", lang)}
              sub={t("live_coming", lang)}
            />
          </div>
        );
      default:
        return <Feed />;
    }
  }

  // show a subtle loading state while route param pages fetch their own data
  const needsSuspense = ["tag", "profile"].includes(route.name);

  return (
    <>
      <AppShell onCreate={onCreate}>
        <div key={`${route.name}:${route.param ?? ""}`}>{view()}</div>
      </AppShell>
      <StoryCreator open={storyOpen} onOpenChange={setStoryOpen} />
      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} onSaved={onCreated} />
      {needsSuspense && null}
    </>
  );
}
