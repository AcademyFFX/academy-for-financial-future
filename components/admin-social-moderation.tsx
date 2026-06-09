"use client";

import { Save, ShieldCheck, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type SocialPost = {
  id: string;
  author_name: string;
  author_email: string;
  category: string;
  title: string;
  body: string;
  chart_url: string | null;
  lesson_title: string | null;
  achievement_level: string;
  status: string;
  moderator_notes: string | null;
  created_at: string;
};

type StudyGroup = {
  id: string;
  name: string;
  focus_area: string;
  creator_name: string;
  active: boolean;
  created_at: string;
};

type ReviewState = {
  status: string;
  moderatorNotes: string;
};

export function AdminSocialModeration() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [message, setMessage] = useState("Moderate student community posts, screenshots, replies, and study groups.");

  const reportedCount = useMemo(() => posts.filter((post) => post.status === "Reported").length, [posts]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadModeration = useCallback(async () => {
    try {
      const supabase = createClient();
      const [postsResult, groupsResult] = await Promise.all([
        supabase.from("social_posts").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("study_groups").select("*").order("created_at", { ascending: false }).limit(50)
      ]);

      if (postsResult.error) throw postsResult.error;
      if (groupsResult.error) throw groupsResult.error;

      const loadedPosts = (postsResult.data ?? []) as SocialPost[];
      setPosts(loadedPosts);
      setGroups((groupsResult.data ?? []) as StudyGroup[]);
      setReviews(Object.fromEntries(loadedPosts.map((post) => [
        post.id,
        {
          status: post.status,
          moderatorNotes: post.moderator_notes ?? ""
        }
      ])));
      setMessage("Social moderation center ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the social learning migration to enable moderation."));
    }
  }, []);

  useEffect(() => {
    loadModeration();
  }, [loadModeration]);

  async function savePostReview(postId: string) {
    const review = reviews[postId];
    if (!review) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("social_posts")
        .update({
          status: review.status,
          moderator_notes: review.moderatorNotes.trim() || null,
          moderated_by: "acafffx@gmail.com",
          moderated_at: new Date().toISOString()
        })
        .eq("id", postId)
        .select("*")
        .single();

      if (error) throw error;
      setPosts((current) => current.map((post) => (post.id === postId ? data as SocialPost : post)));
      setMessage("Post moderation saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save post moderation."));
    }
  }

  async function deletePost(postId: string) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("social_posts").delete().eq("id", postId);
      if (error) throw error;
      setPosts((current) => current.filter((post) => post.id !== postId));
      setMessage("Post deleted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to delete post."));
    }
  }

  async function toggleGroup(group: StudyGroup) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("study_groups").update({ active: !group.active }).eq("id", group.id).select("*").single();
      if (error) throw error;
      setGroups((current) => current.map((item) => (item.id === group.id ? data as StudyGroup : item)));
      setMessage("Study group status updated.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update study group."));
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="terminal-panel overflow-hidden">
        <div className="border-b border-gold-500/20 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Social Learning Network</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Moderation Tools</h2>
              <p className="mt-2 text-sm text-ink/68">{message}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 border border-gold-500/30 px-3 py-2 text-xs uppercase tracking-[.18em] text-gold-300">
              <ShieldCheck size={15} /> {reportedCount} Reported
            </span>
          </div>
        </div>

        {posts.length === 0 ? (
          <p className="p-5 text-ink/68">No community posts yet.</p>
        ) : (
          <div className="grid gap-px bg-gold-500/14">
            {posts.map((post) => (
              <article key={post.id} className="bg-navy-950 p-5">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    <p className="text-xs uppercase tracking-[.2em] text-gold-300">{post.category} - {post.status}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{post.title}</h3>
                    <p className="mt-2 text-sm text-ink/58">{post.author_name} - {post.author_email}</p>
                    {post.lesson_title ? <p className="mt-2 text-sm text-gold-300">Lesson: {post.lesson_title}</p> : null}
                    <p className="mt-4 leading-7 text-ink/74">{post.body}</p>
                    {post.chart_url ? <a className="mt-3 inline-flex text-sm text-gold-300" href={post.chart_url} target="_blank" rel="noreferrer">Open screenshot</a> : null}
                  </div>
                  <div className="grid gap-3">
                    <select
                      className="border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                      value={reviews[post.id]?.status ?? post.status}
                      onChange={(event) => setReviews((current) => ({
                        ...current,
                        [post.id]: { ...(current[post.id] ?? { moderatorNotes: "" }), status: event.target.value }
                      }))}
                    >
                      <option>Approved</option>
                      <option>Featured</option>
                      <option>Reported</option>
                      <option>Hidden</option>
                      <option>Removed</option>
                    </select>
                    <textarea
                      className="min-h-24 border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                      placeholder="Moderator notes"
                      value={reviews[post.id]?.moderatorNotes ?? ""}
                      onChange={(event) => setReviews((current) => ({
                        ...current,
                        [post.id]: { ...(current[post.id] ?? { status: post.status }), moderatorNotes: event.target.value }
                      }))}
                    />
                    <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950" type="button" onClick={() => savePostReview(post.id)}>
                      <Save size={16} /> Save
                    </button>
                    <button className="inline-flex items-center justify-center gap-2 border border-red-300/45 px-4 py-2 text-sm text-red-200" type="button" onClick={() => deletePost(post.id)}>
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="terminal-panel overflow-hidden">
        <div className="border-b border-gold-500/20 p-5">
          <div className="flex items-center gap-3">
            <Users className="text-gold-300" size={22} />
            <h2 className="text-xl font-semibold text-white">Study Group Moderation</h2>
          </div>
        </div>
        {groups.length === 0 ? (
          <p className="p-5 text-ink/68">No study groups yet.</p>
        ) : (
          <div className="grid gap-px bg-gold-500/14">
            {groups.map((group) => (
              <article key={group.id} className="bg-navy-950 p-5">
                <p className="text-xs uppercase tracking-[.2em] text-gold-300">{group.focus_area} - {group.active ? "Active" : "Inactive"}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{group.name}</h3>
                <p className="mt-2 text-sm text-ink/58">Created by {group.creator_name}</p>
                <button className="mt-4 border border-gold-500/40 px-3 py-2 text-sm text-gold-300" type="button" onClick={() => toggleGroup(group)}>
                  {group.active ? "Deactivate" : "Activate"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
