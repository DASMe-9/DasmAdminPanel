import React, { useEffect, useMemo, useState, useCallback } from "react";
import Layout from "../components/Layout";
import { apiFetch, extractErrorMessage } from "../utils/api";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ClipboardDocumentIcon,
  CloudIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeYouTubeId(input: string): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  if (/^[a-zA-Z0-9_-]{8,20}$/.test(raw) && !raw.includes("http")) return raw;
  try {
    const url = new URL(raw);
    const v = url.searchParams.get("v");
    if (v) return v;
    if (url.hostname.includes("youtu.be")) return url.pathname.replace("/", "").trim() || null;
    const parts = url.pathname.split("/").filter(Boolean);
    const embedIndex = parts.findIndex((p) => p === "embed");
    if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1];
    const liveIndex = parts.findIndex((p) => p === "live");
    if (liveIndex >= 0 && parts[liveIndex + 1]) return parts[liveIndex + 1];
    return null;
  } catch {
    return null;
  }
}

function toDatetimeLocal(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type AuctionLite = { id: number; status?: string; car?: any; [key: string]: any };

function extractAuctions(payload: any): AuctionLite[] {
  const d1 = payload?.data;
  if (Array.isArray(d1)) return d1;
  const d2 = d1?.data;
  if (Array.isArray(d2)) return d2;
  if (Array.isArray(payload)) return payload;
  return [];
}

function auctionLabel(a: any): string {
  const id = a?.id ?? "—";
  const car = a?.car;
  const carName = car ? [car?.make, car?.brand, car?.model, car?.year].filter(Boolean).join(" ") : "";
  return carName ? `#${id} — ${carName}` : `#${id}`;
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`relative inline-flex items-center select-none ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
      <input type="checkbox" className="sr-only peer" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="block w-12 h-7 rounded-full bg-gray-300 peer-checked:bg-emerald-500 transition-colors" />
      <span className="absolute top-0.5 right-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:-translate-x-5" />
    </label>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = "youtube" | "cloudflare";

type BroadcastState = {
  id: number | null;
  provider: Provider;
  auctionId: string;
  title: string;
  description: string;
  youtubeInput: string;
  youtubeChatUrl: string;
  streamUrl: string;
  isLive: boolean;
  scheduledStart: string;
};

type CfCredentials = {
  rtmpUrl: string;
  streamKey: string;
  hlsUrl: string;
  uid: string;
};

type CfStatus = "idle" | "checking" | "connected" | "not_connected" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveStreamPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingCf, setCreatingCf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [auctions, setAuctions] = useState<AuctionLite[]>([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const [auctionSearch, setAuctionSearch] = useState("");

  const [state, setState] = useState<BroadcastState>({
    id: null,
    provider: "youtube",
    auctionId: "",
    title: "",
    description: "",
    youtubeInput: "",
    youtubeChatUrl: "",
    streamUrl: "",
    isLive: false,
    scheduledStart: "",
  });

  const [cfCreds, setCfCreds] = useState<CfCredentials | null>(null);
  const [cfStatus, setCfStatus] = useState<CfStatus>("idle");
  const [copied, setCopied] = useState<string | null>(null);

  const videoId = useMemo(() => normalizeYouTubeId(state.youtubeInput), [state.youtubeInput]);
  const embedUrl = useMemo(() => (videoId ? `https://www.youtube.com/embed/${videoId}` : ""), [videoId]);

  const filteredAuctions = useMemo(() => {
    const s = auctionSearch.trim().toLowerCase();
    if (!s) return auctions;
    return auctions.filter((a) => {
      const id = String(a?.id ?? "").toLowerCase();
      const label = auctionLabel(a).toLowerCase();
      return id.includes(s) || label.includes(s);
    });
  }, [auctions, auctionSearch]);

  async function loadAuctions() {
    setAuctionsLoading(true);
    try {
      const res: any = await apiFetch(`/admin/auctions?per_page=100`, { method: "GET" });
      setAuctions(extractAuctions(res));
    } catch {
      setAuctions([]);
    } finally {
      setAuctionsLoading(false);
    }
  }

  async function loadBroadcast() {
    setError(null);
    setOkMsg(null);
    setLoading(true);
    try {
      const res: any = await apiFetch("/admin/broadcast", { method: "GET" });
      const data = res?.data ?? null;
      if (!data) {
        setState({ id: null, provider: "youtube", auctionId: "", title: "", description: "", youtubeInput: "", youtubeChatUrl: "", streamUrl: "", isLive: false, scheduledStart: "" });
        setCfCreds(null);
        return;
      }

      const provider: Provider = data?.stream_provider === "cloudflare" ? "cloudflare" : "youtube";

      setState({
        id: data?.id ? Number(data.id) : null,
        provider,
        auctionId: data?.auction_id ? String(data.auction_id) : "",
        title: data?.title ?? "",
        description: data?.description ?? "",
        youtubeInput: data?.youtube_embed_url ?? data?.stream_url ?? "",
        youtubeChatUrl: data?.youtube_chat_embed_url ?? "",
        streamUrl: data?.stream_url ?? "",
        isLive: Boolean(data?.is_live ?? false),
        scheduledStart: toDatetimeLocal(data?.scheduled_start_time ?? null),
      });

      // If cloudflare broadcast, fetch RTMP credentials
      if (provider === "cloudflare" && data?.id) {
        loadCfCredentials(Number(data.id));
      }
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadCfCredentials(broadcastId: number) {
    try {
      const res: any = await apiFetch(`/admin/broadcast/${broadcastId}/rtmp-credentials`, { method: "GET" });
      const d = res?.data;
      if (d) {
        setCfCreds({
          rtmpUrl: d.rtmp_url ?? "",
          streamKey: d.stream_key ?? "",
          hlsUrl: d.hls_playback_url ?? "",
          uid: d.cf_live_input_uid ?? "",
        });
      }
    } catch {
      setCfCreds(null);
    }
  }

  const checkCfStatus = useCallback(async () => {
    if (!state.id) return;
    setCfStatus("checking");
    try {
      const res: any = await apiFetch(`/admin/broadcast/${state.id}/cf-status`, { method: "GET" });
      const connected = res?.data?.connected;
      setCfStatus(connected ? "connected" : "not_connected");
    } catch {
      setCfStatus("error");
    }
  }, [state.id]);

  useEffect(() => {
    loadAuctions();
    loadBroadcast();
  }, []);

  async function createCloudflareBroadcast() {
    if (!state.title.trim()) {
      setError("أدخل عنوان البث أولاً.");
      return;
    }
    setError(null);
    setOkMsg(null);
    setCreatingCf(true);
    try {
      const res: any = await apiFetch("/admin/broadcast/cloudflare", {
        method: "POST",
        body: JSON.stringify({
          title: state.title.trim(),
          description: state.description?.trim() || null,
          auction_id: state.auctionId ? Number(state.auctionId) : null,
          scheduled_start_time: fromDatetimeLocal(state.scheduledStart),
        }),
      });
      const d = res?.data;
      if (d) {
        setState((s) => ({ ...s, id: Number(d.id), isLive: false }));
        setCfCreds({
          rtmpUrl: d.rtmp_url ?? "",
          streamKey: d.stream_key ?? "",
          hlsUrl: d.hls_url ?? "",
          uid: d.cf_live_input_uid ?? "",
        });
        setOkMsg("✅ تم إنشاء بث Cloudflare — انسخ بيانات OBS وابدأ البث");
        await loadBroadcast();
      }
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setCreatingCf(false);
    }
  }

  function buildYoutubePayload(withId: boolean) {
    const vid = normalizeYouTubeId(state.youtubeInput);
    const youtube_embed_url = vid
      ? `https://www.youtube.com/embed/${vid}`
      : state.youtubeInput.trim() || null;
    const payload: any = {
      title: state.title.trim(),
      auction_id: state.auctionId ? Number(state.auctionId) : null,
      description: state.description?.trim() || null,
      stream_url: state.streamUrl?.trim() || null,
      youtube_embed_url,
      youtube_chat_embed_url: state.youtubeChatUrl?.trim() || null,
      scheduled_start_time: fromDatetimeLocal(state.scheduledStart),
      is_live: Boolean(state.isLive),
    };
    if (withId && state.id) payload.id = state.id;
    return payload;
  }

  async function saveYoutube(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    if (!state.title.trim()) { setError("اكتب عنوان البث."); return; }
    if (!state.auctionId.trim()) { setError("اختر المزاد المرتبط."); return; }
    setSaving(true);
    try {
      if (state.id) {
        await apiFetch("/admin/broadcast", { method: "PUT", body: JSON.stringify(buildYoutubePayload(true)) });
        setOkMsg("تم حفظ التعديلات ✅");
      } else {
        const created: any = await apiFetch("/admin/broadcast", { method: "POST", body: JSON.stringify(buildYoutubePayload(false)) });
        const newId = created?.data?.id ?? null;
        if (newId) setState((s) => ({ ...s, id: Number(newId) }));
        setOkMsg("تم إنشاء البث ✅");
      }
      await loadBroadcast();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleLive() {
    if (!state.id) { setError("احفظ البث أولاً."); return; }
    setError(null);
    setOkMsg(null);
    setToggling(true);
    try {
      const next = !state.isLive;
      await apiFetch("/admin/broadcast/status", { method: "PUT", body: JSON.stringify({ id: state.id, is_live: next }) });
      setState((s) => ({ ...s, isLive: next }));
      setOkMsg(next ? "تم تشغيل البث ✅" : "تم إيقاف البث ✅");
      await loadBroadcast();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setToggling(false);
    }
  }

  async function removeBroadcast() {
    if (!state.id) return;
    if (!confirm("هل تريد حذف البث؟")) return;
    setDeleting(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch(`/admin/broadcast/${state.id}`, { method: "DELETE" });
      setOkMsg("تم حذف البث ✅");
      setState({ id: null, provider: "youtube", auctionId: "", title: "", description: "", youtubeInput: "", youtubeChatUrl: "", streamUrl: "", isLive: false, scheduledStart: "" });
      setCfCreds(null);
      setCfStatus("idle");
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  async function copy(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("تعذر النسخ.");
    }
  }

  const cfStatusColor: Record<CfStatus, string> = {
    idle: "text-gray-400",
    checking: "text-yellow-500",
    connected: "text-emerald-600",
    not_connected: "text-red-500",
    error: "text-red-400",
  };

  const cfStatusLabel: Record<CfStatus, string> = {
    idle: "لم يتم الفحص",
    checking: "جاري الفحص...",
    connected: "متصل — OBS يبث",
    not_connected: "غير متصل — OBS لم يبدأ",
    error: "خطأ في الاتصال",
  };

  return (
      <div className="min-h-screen bg-gray-50/60 p-4 sm:p-6 lg:p-8" dir="rtl">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">إدارة البث</h1>
              <p className="text-sm text-gray-600 mt-1">YouTube أو Cloudflare — تشغيل، إيقاف، مراقبة.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { loadAuctions(); loadBroadcast(); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-bold disabled:opacity-60" disabled={loading}>
                <ArrowPathIcon className="h-5 w-5" />
                تحديث
              </button>
              <button onClick={toggleLive} disabled={!state.id || toggling} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold disabled:opacity-60 ${state.isLive ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}>
                {state.isLive ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                {toggling ? "..." : state.isLive ? "إيقاف البث" : "تشغيل البث"}
              </button>
              <button onClick={removeBroadcast} disabled={!state.id || deleting} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-red-50 text-sm font-bold text-red-700 disabled:opacity-60">
                <TrashIcon className="h-5 w-5" />
                حذف
              </button>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 mt-0.5 shrink-0" />
              <div className="text-sm font-semibold">{error}</div>
            </div>
          )}
          {okMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircleIcon className="h-6 w-6 mt-0.5 shrink-0" />
              <div className="text-sm font-semibold">{okMsg}</div>
            </div>
          )}

          {/* Provider Tabs */}
          {!state.id && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setState((s) => ({ ...s, provider: "youtube" }))}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${state.provider === "youtube" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  ▶ YouTube
                </button>
                <button
                  onClick={() => setState((s) => ({ ...s, provider: "cloudflare" }))}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${state.provider === "cloudflare" ? "bg-orange-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  <CloudIcon className="h-4 w-4" />
                  Cloudflare Stream
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ── Left: Form ── */}
            <div className="lg:col-span-3 space-y-6">
              {/* Common Fields */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-5">
                {loading ? (
                  <div className="text-gray-500">جاري التحميل...</div>
                ) : (
                  <>
                    {/* Auction */}
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div><div className="text-sm font-extrabold text-gray-900">المزاد</div></div>
                        <button type="button" onClick={loadAuctions} className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-xs font-bold disabled:opacity-60" disabled={auctionsLoading}>
                          {auctionsLoading ? "جاري..." : "تحديث"}
                        </button>
                      </div>
                      {auctions.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <input value={auctionSearch} onChange={(e) => setAuctionSearch(e.target.value)} placeholder="بحث سريع..." className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                          <select value={state.auctionId} onChange={(e) => setState({ ...state, auctionId: e.target.value })} className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-200">
                            <option value="">— اختر —</option>
                            {filteredAuctions.map((a) => (<option key={a.id} value={String(a.id)}>{auctionLabel(a)}</option>))}
                          </select>
                        </div>
                      ) : (
                        <input value={state.auctionId} onChange={(e) => setState({ ...state, auctionId: e.target.value })} placeholder="رقم المزاد" className="mt-3 w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                      )}
                    </div>

                    {/* Title + Scheduled */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-extrabold text-gray-900 mb-2">العنوان</label>
                        <input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white outline-none focus:ring-2 focus:ring-blue-200" placeholder="عنوان البث" value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-extrabold text-gray-900 mb-2">موعد البدء (اختياري)</label>
                        <input type="datetime-local" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white outline-none focus:ring-2 focus:ring-blue-200" value={state.scheduledStart} onChange={(e) => setState({ ...state, scheduledStart: e.target.value })} />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-extrabold text-gray-900 mb-2">الوصف</label>
                      <textarea rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white outline-none focus:ring-2 focus:ring-blue-200" placeholder="وصف مختصر" value={state.description} onChange={(e) => setState({ ...state, description: e.target.value })} />
                    </div>

                    {/* ── YouTube-specific fields ── */}
                    {state.provider === "youtube" && (
                      <form onSubmit={saveYoutube} className="space-y-5">
                        <div>
                          <label className="block text-sm font-extrabold text-gray-900 mb-2">رابط/معرف اليوتيوب</label>
                          <div className="relative">
                            <input type="text" className="w-full pl-4 pr-11 py-3 border border-gray-200 rounded-2xl bg-white outline-none focus:ring-2 focus:ring-blue-200" placeholder="رابط الفيديو أو المعرف" value={state.youtubeInput} onChange={(e) => setState({ ...state, youtubeInput: e.target.value })} />
                            <LinkIcon className="h-5 w-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                          <div>
                            <div className="text-sm font-extrabold text-gray-900">البث مباشر الآن</div>
                            <div className="text-xs text-gray-600 mt-1">فعّلها عند بدء البث.</div>
                          </div>
                          <Toggle checked={state.isLive} onChange={(v) => setState({ ...state, isLive: v })} disabled={saving} />
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="submit" className="bg-red-600 text-white px-6 py-3 rounded-2xl hover:bg-red-700 disabled:opacity-60 text-sm font-extrabold" disabled={saving}>
                            {saving ? "جاري الحفظ..." : state.id ? "حفظ" : "إنشاء"}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* ── Cloudflare-specific ── */}
                    {state.provider === "cloudflare" && !state.id && (
                      <div className="space-y-4">
                        <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-sm text-orange-800">
                          <strong>Cloudflare Stream:</strong> سيتم إنشاء Live Input تلقائياً وستحصل على بيانات OBS جاهزة للنسخ.
                        </div>
                        <button
                          onClick={createCloudflareBroadcast}
                          disabled={creatingCf || !state.title.trim()}
                          className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl text-sm font-extrabold disabled:opacity-60"
                        >
                          <CloudIcon className="h-5 w-5" />
                          {creatingCf ? "جاري الإنشاء..." : "إنشاء بث Cloudflare"}
                        </button>
                      </div>
                    )}

                    {/* Cloudflare broadcast already exists — show info */}
                    {state.provider === "cloudflare" && state.id && (
                      <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700 space-y-2">
                        <div className="font-extrabold text-gray-900">بث Cloudflare #{state.id}</div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${cfStatusColor[cfStatus]}`}>{cfStatusLabel[cfStatus]}</span>
                          <button onClick={checkCfStatus} disabled={cfStatus === "checking"} className="px-3 py-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold disabled:opacity-60 flex items-center gap-1">
                            <SignalIcon className="h-4 w-4" />
                            فحص الاتصال
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── Cloudflare OBS Credentials ── */}
              {state.provider === "cloudflare" && cfCreds && (
                <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6 space-y-4">
                  <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <CloudIcon className="h-5 w-5 text-orange-500" />
                    بيانات OBS — Cloudflare Stream
                  </h3>

                  {[
                    { label: "RTMP Server", value: cfCreds.rtmpUrl, field: "server" },
                    { label: "Stream Key", value: cfCreds.streamKey, field: "key" },
                    { label: "HLS Playback URL", value: cfCreds.hlsUrl, field: "hls" },
                  ].map(({ label, value, field }) => (
                    <div key={field}>
                      <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-mono text-xs text-gray-900 break-all">
                          {value || "—"}
                        </div>
                        <button
                          onClick={() => copy(value, field)}
                          disabled={!value}
                          className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all disabled:opacity-40 ${copied === field ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                        >
                          {copied === field ? <CheckCircleIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-xs text-orange-800 space-y-1">
                    <div className="font-bold">خطوات OBS:</div>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Settings → Stream → Service: Custom RTMP</li>
                      <li>الصق RTMP Server في حقل Server</li>
                      <li>الصق Stream Key في حقل Stream Key</li>
                      <li>اضغط Apply ثم Start Streaming</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Preview + Quick Steps ── */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-gray-900">معاينة</h3>
                  {state.isLive ? (
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">مباشر</span>
                  ) : (
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">غير مباشر</span>
                  )}
                </div>
                <div className="mt-3">
                  {state.provider === "youtube" && videoId ? (
                    <div className="aspect-video rounded-2xl overflow-hidden border border-gray-100 bg-black">
                      <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${videoId}`} title="YouTube preview" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  ) : state.provider === "cloudflare" && cfCreds?.hlsUrl ? (
                    <div className="aspect-video rounded-2xl overflow-hidden border border-gray-100 bg-black flex items-center justify-center">
                      <div className="text-center text-white text-sm space-y-2">
                        <CloudIcon className="h-10 w-10 mx-auto text-orange-400" />
                        <div>Cloudflare HLS</div>
                        <div className="text-xs text-gray-400 font-mono break-all px-2">{cfCreds.uid}</div>
                        <div className={`text-xs font-bold ${cfStatusColor[cfStatus]}`}>{cfStatusLabel[cfStatus]}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-2xl p-4">
                      {state.provider === "cloudflare" ? "أنشئ البث لعرض معلومات Cloudflare." : "أدخل رابط يوتيوب للمعاينة."}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-extrabold text-gray-900 mb-3">
                  {state.provider === "cloudflare" ? "خطوات Cloudflare" : "خطوات YouTube"}
                </h3>
                {state.provider === "cloudflare" ? (
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>اختر المزاد واكتب العنوان.</li>
                    <li>اضغط «إنشاء بث Cloudflare».</li>
                    <li>انسخ بيانات OBS (Server + Key).</li>
                    <li>في OBS: ابدأ البث.</li>
                    <li>اضغط «فحص الاتصال» للتأكد.</li>
                    <li>اضغط «تشغيل البث» في لوحة الأدمن.</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>اختَر المزاد.</li>
                    <li>أضف رابط اليوتيوب.</li>
                    <li>اكتب العنوان والوصف.</li>
                    <li>احفظ، ثم شغّل/أوقف حسب الحاجة.</li>
                  </ol>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export default function LiveStream() {
  return (
    <Layout>
      <LiveStreamPanel />
    </Layout>
  );
}
