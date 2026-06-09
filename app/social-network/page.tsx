"use client";

import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  Heart,
  MessageSquare,
  Send,
  ShieldCheck,
  UploadCloud,
  Users
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type Post = {
  id: string;
  student_id: string;
  author_name: string;
  author_email: string;
  category: string;
  title: string;
  body: string;
  chart_url: string | null;
  lesson_title: string | null;
  achievement_level: string;
  status: string;
  created_at: string;
};

type Reply = {
  id: string;
  post_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

type LikeRow = {
  id: string;
  post_id: string;
  student_id: string;
};

type StudyGroup = {
  id: string;
  name: string;
  focus_area: string;
  meeting_time: string | null;
  description: string | null;
};

const initialPost = {
  category: "Forex Anatomy",
  title: "",
  body: "",
  chartUrl: "",
  lessonTitle: ""
};

const initialGroup = {
  name: "",
  focusArea: "Market Structure",
  meetingTime: "",
  description: ""
};

const categories = [
  "Forex Anatomy",
  "Market Structure",
  "Liquidity Sweeps",
  "Institutional Orders",
  "Order Flow",
  "Trading Journal",
  "Lesson Discussion",
  "Risk Management"
];

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

function getAchievementLevel(posts: number, likes: number) {
  if (posts >= 10 || likes >= 50) return "Institutional Scholar";
  if (posts >= 5 || likes >= 20) return "Forex Anatomy Builder";
  if (posts >= 2 || likes >= 8) return "Market Structure Explorer";
  return "AFF Community Member";
}

export default function SocialNetworkPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("AFF Student");
  const [studentEmail, setStudentEmail] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [followingInstructor, setFollowingInstructor] = useState(false);
  const [postForm, setPostForm] = useState(initialPost);
  const [groupForm, setGroupForm] = useState(initialGroup);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Loading AFF Social Learning Network...");
  const [loading, setLoading] = useState(true);

  const myPosts = useMemo(() => posts.filter((post) => post.student_id === studentId), [posts, studentId]);
  const myLikes = useMemo(() => likes.filter((like) => like.student_id === studentId), [likes, studentId]);
  const achievementLevel = getAchievementLevel(myPosts.length, myLikes.length);

  function postLikes(postId: string) {
    return likes.filter((like) => like.post_id === postId);
  }

  function postReplies(postId: string) {
    return replies.filter((reply) => reply.post_id === postId);
  }

  function hasLiked(postId: string) {
    return likes.some((like) => like.post_id === postId && like.student_id === studentId);
  }

  const loadCommunity = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const name =
        typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
          ? user.user_metadata.name
          : user.email ?? "AFF Student";
      setStudentId(user.id);
      setStudentName(name);
      setStudentEmail(user.email ?? "");

      const [postsResult, repliesResult, likesResult, groupsResult, followResult] = await Promise.all([
        supabase.from("social_posts").select("*").in("status", ["Approved", "Featured"]).order("created_at", { ascending: false }).limit(80),
        supabase.from("social_post_replies").select("*").order("created_at", { ascending: true }).limit(200),
        supabase.from("social_post_likes").select("*").limit(500),
        supabase.from("study_groups").select("*").eq("active", true).order("created_at", { ascending: false }).limit(20),
        supabase.from("instructor_follows").select("*").eq("student_id", user.id).eq("instructor_email", "acafffx@gmail.com").maybeSingle()
      ]);

      for (const result of [postsResult, repliesResult, likesResult, groupsResult]) {
        if (result.error) throw result.error;
      }

      setPosts((postsResult.data ?? []) as Post[]);
      setReplies((repliesResult.data ?? []) as Reply[]);
      setLikes((likesResult.data ?? []) as LikeRow[]);
      setGroups((groupsResult.data ?? []) as StudyGroup[]);
      setFollowingInstructor(Boolean(followResult.data));
      setMessage("Social Learning Network ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the social learning migration to enable community features."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  async function createPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId) return;
    setMessage("Publishing community post...");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("social_posts").insert({
        student_id: studentId,
        author_name: studentName,
        author_email: studentEmail,
        category: postForm.category,
        title: postForm.title.trim(),
        body: postForm.body.trim(),
        chart_url: postForm.chartUrl.trim() || null,
        lesson_title: postForm.lessonTitle.trim() || null,
        achievement_level: achievementLevel,
        status: "Approved"
      }).select("*").single();

      if (error) throw error;
      setPosts((current) => [data as Post, ...current]);
      setPostForm(initialPost);
      setMessage("Post published to the AFF community.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to publish community post."));
    }
  }

  async function toggleLike(postId: string) {
    if (!studentId) return;

    try {
      const supabase = createClient();
      const existing = likes.find((like) => like.post_id === postId && like.student_id === studentId);

      if (existing) {
        const { error } = await supabase.from("social_post_likes").delete().eq("id", existing.id);
        if (error) throw error;
        setLikes((current) => current.filter((like) => like.id !== existing.id));
      } else {
        const { data, error } = await supabase.from("social_post_likes").insert({
          post_id: postId,
          student_id: studentId
        }).select("*").single();
        if (error) throw error;
        setLikes((current) => [data as LikeRow, ...current]);
      }
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update like."));
    }
  }

  async function addReply(postId: string) {
    const body = (replyText[postId] ?? "").trim();
    if (!studentId || !body) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("social_post_replies").insert({
        post_id: postId,
        student_id: studentId,
        author_name: studentName,
        body
      }).select("*").single();

      if (error) throw error;
      setReplies((current) => [...current, data as Reply]);
      setReplyText((current) => ({ ...current, [postId]: "" }));
      setMessage("Reply added.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to add reply."));
    }
  }

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("study_groups").insert({
        created_by: studentId,
        creator_name: studentName,
        name: groupForm.name.trim(),
        focus_area: groupForm.focusArea,
        meeting_time: groupForm.meetingTime.trim() || null,
        description: groupForm.description.trim() || null
      }).select("*").single();

      if (error) throw error;
      setGroups((current) => [data as StudyGroup, ...current]);
      setGroupForm(initialGroup);
      setMessage("Study group created.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to create study group."));
    }
  }

  async function followInstructor() {
    if (!studentId) return;

    try {
      const supabase = createClient();
      if (followingInstructor) {
        const { error } = await supabase.from("instructor_follows").delete().eq("student_id", studentId).eq("instructor_email", "acafffx@gmail.com");
        if (error) throw error;
        setFollowingInstructor(false);
      } else {
        const { error } = await supabase.from("instructor_follows").insert({
          student_id: studentId,
          instructor_name: "Dr. Jean Rene Moricette",
          instructor_email: "acafffx@gmail.com"
        });
        if (error) throw error;
        setFollowingInstructor(true);
      }
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update instructor follow status."));
    }
  }

  async function reportPost(postId: string) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("social_posts").update({ status: "Reported" }).eq("id", postId);
      if (error) throw error;
      setPosts((current) => current.filter((post) => post.id !== postId));
      setMessage("Post reported for moderation.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to report post."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Social Learning Network"
        title="Learn forex together inside the AFF community."
        text="Post charts, discuss market structure, share journals, comment on lessons, join study groups, follow instructors, and participate in Forex Anatomy conversations."
      />
      <Section>
        <SectionInner className="grid gap-6">
          <p className="text-sm text-ink/72">{message}</p>

          <section className="grid gap-4 md:grid-cols-4">
            <Metric icon={<Users size={20} />} label="Community Posts" value={String(posts.length)} />
            <Metric icon={<MessageSquare size={20} />} label="Replies" value={String(replies.length)} />
            <Metric icon={<Heart size={20} />} label="Likes" value={String(likes.length)} />
            <Metric icon={<BadgeCheck size={20} />} label="Achievement Level" value={achievementLevel} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <aside className="grid gap-6">
              <form onSubmit={createPost} className="terminal-panel grid gap-4 p-6">
                <div className="flex items-center gap-3">
                  <UploadCloud className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Create Community Post</h2>
                </div>
                <label className="grid gap-2 text-sm text-ink/74">
                  Category
                  <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={postForm.category} onChange={(event) => setPostForm((current) => ({ ...current, category: event.target.value }))}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-ink/74">
                  Title
                  <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={postForm.title} onChange={(event) => setPostForm((current) => ({ ...current, title: event.target.value }))} required />
                </label>
                <label className="grid gap-2 text-sm text-ink/74">
                  Post
                  <textarea className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={postForm.body} onChange={(event) => setPostForm((current) => ({ ...current, body: event.target.value }))} required />
                </label>
                <label className="grid gap-2 text-sm text-ink/74">
                  Chart or screenshot URL
                  <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={postForm.chartUrl} onChange={(event) => setPostForm((current) => ({ ...current, chartUrl: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm text-ink/74">
                  Lesson title
                  <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={postForm.lessonTitle} onChange={(event) => setPostForm((current) => ({ ...current, lessonTitle: event.target.value }))} placeholder="The Skeleton: Market Structure" />
                </label>
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                  <Send size={18} /> Publish Post
                </button>
              </form>

              <section className="terminal-panel p-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Instructor Network</h2>
                </div>
                <p className="mt-3 leading-7 text-ink/70">Follow Dr. Jean Rene Moricette for instructor-marked discussions, featured posts, and Forex Anatomy guidance.</p>
                <button className="mt-5 border border-gold-500/45 px-5 py-3 font-semibold text-gold-300" type="button" onClick={followInstructor}>
                  {followingInstructor ? "Following Instructor" : "Follow Instructor"}
                </button>
              </section>

              <form onSubmit={createGroup} className="terminal-panel grid gap-4 p-6">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Create Study Group</h2>
                </div>
                <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Group name" value={groupForm.name} onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))} required />
                <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={groupForm.focusArea} onChange={(event) => setGroupForm((current) => ({ ...current, focusArea: event.target.value }))}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
                <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Meeting time" value={groupForm.meetingTime} onChange={(event) => setGroupForm((current) => ({ ...current, meetingTime: event.target.value }))} />
                <textarea className="min-h-20 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Group description" value={groupForm.description} onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))} />
                <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">Create Group</button>
              </form>
            </aside>

            <div className="grid gap-6">
              <section className="terminal-panel overflow-hidden">
                <div className="border-b border-gold-500/20 p-5">
                  <h2 className="text-xl font-semibold text-white">AFF Community Feed</h2>
                </div>
                {loading ? (
                  <p className="p-5 text-ink/68">Loading community feed...</p>
                ) : posts.length === 0 ? (
                  <p className="p-5 text-ink/68">No community posts yet.</p>
                ) : (
                  <div className="grid gap-px bg-gold-500/14">
                    {posts.map((post) => (
                      <article key={post.id} className="bg-navy-950 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[.2em] text-gold-300">{post.category} - {post.achievement_level}</p>
                            <h3 className="mt-2 text-xl font-semibold text-white">{post.title}</h3>
                            <p className="mt-2 text-sm text-ink/58">{post.author_name} - {new Date(post.created_at).toLocaleString()}</p>
                          </div>
                          <button className="text-xs text-ink/50 hover:text-red-200" type="button" onClick={() => reportPost(post.id)}>Report</button>
                        </div>
                        {post.lesson_title ? <p className="mt-3 text-sm text-gold-300">Lesson: {post.lesson_title}</p> : null}
                        <p className="mt-4 leading-7 text-ink/76">{post.body}</p>
                        {post.chart_url ? (
                          <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-300" href={post.chart_url} target="_blank" rel="noreferrer">
                            <UploadCloud size={16} /> Open Chart Screenshot
                          </a>
                        ) : null}
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <button className={`inline-flex items-center gap-2 border px-3 py-2 text-sm ${hasLiked(post.id) ? "border-gold-500 bg-gold-500 text-navy-950" : "border-gold-500/40 text-gold-300"}`} type="button" onClick={() => toggleLike(post.id)}>
                            <Heart size={16} /> {postLikes(post.id).length}
                          </button>
                          <span className="inline-flex items-center gap-2 text-sm text-ink/62"><MessageSquare size={16} /> {postReplies(post.id).length} replies</span>
                        </div>
                        <div className="mt-5 grid gap-3 border-t border-gold-500/15 pt-4">
                          {postReplies(post.id).map((reply) => (
                            <div key={reply.id} className="border border-gold-500/14 bg-navy-900 p-3">
                              <p className="text-sm font-semibold text-white">{reply.author_name}</p>
                              <p className="mt-1 text-sm leading-6 text-ink/72">{reply.body}</p>
                            </div>
                          ))}
                          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input className="border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none" placeholder="Reply to this discussion" value={replyText[post.id] ?? ""} onChange={(event) => setReplyText((current) => ({ ...current, [post.id]: event.target.value }))} />
                            <button className="bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950" type="button" onClick={() => addReply(post.id)}>Reply</button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="terminal-panel overflow-hidden">
                <div className="border-b border-gold-500/20 p-5">
                  <h2 className="text-xl font-semibold text-white">Study Groups</h2>
                </div>
                {groups.length === 0 ? (
                  <p className="p-5 text-ink/68">No study groups yet.</p>
                ) : (
                  <div className="grid gap-px bg-gold-500/14 sm:grid-cols-2">
                    {groups.map((group) => (
                      <article key={group.id} className="bg-navy-950 p-5">
                        <p className="text-xs uppercase tracking-[.2em] text-gold-300">{group.focus_area}</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{group.name}</h3>
                        {group.meeting_time ? <p className="mt-2 text-sm text-ink/58">{group.meeting_time}</p> : null}
                        {group.description ? <p className="mt-3 leading-7 text-ink/72">{group.description}</p> : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </section>
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-ink/66">{label}</p>
    </div>
  );
}
