import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { apiFetch, extractErrorMessage } from "../utils/api";
import {
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  XMarkIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

type AuctionApi = any;

type Row = {
  id: number;
  carLabel: string;
  statusRaw: string;
  statusLabel: string;
  currentBid: number;
  reservePrice: number;
  minimumBid: number;
  maximumBid: number | null;
  startAt?: string | null;
  endAt?: string | null;
  auctionType?: string | null;
  approvedForLive?: boolean | null;
  controlRoomApproved?: boolean | null;
  carVin?: string | null;
  carImagesCount?: number | null;
  raw: AuctionApi;
};

function safeNum(v: any): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function safeMaybeNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function pickCarLabel(a: AuctionApi): string {
  const car = a?.car ?? {};
  const make = car?.make ?? "";
  const model = car?.model ?? "";
  const year = car?.year ?? "";
  const vin = car?.vin ?? "";
  const title = [make, model, year].filter(Boolean).join(" ").trim();
  return (title || vin || `مزاد #${a?.id ?? ""}`).trim();
}

function statusToArabicFallback(s: string | null | undefined): string {
  const v = String(s ?? "").toLowerCase();
  if (!v) return "—";
  if (v === "scheduled") return "مجدول";
  if (v === "active" || v === "live") return "نشط";
  if (v === "ended") return "منتهي";
  if (v === "completed") return "مكتمل";
  if (v === "failed") return "فشل";
  if (v === "cancelled" || v === "canceled") return "ملغي";
  return v;
}

function toDatetimeLocal(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function Badge({ label }: { label: string }) {
  const cls =
    label === "نشط"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : label === "منتهي"
      ? "bg-rose-100 text-rose-800 border-rose-200"
      : label === "مكتمل"
      ? "bg-indigo-100 text-indigo-800 border-indigo-200"
      : label === "ملغي" || label === "فشل"
      ? "bg-gray-100 text-gray-800 border-gray-200"
      : "bg-amber-100 text-amber-800 border-amber-200";

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-extrabold rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`relative inline-flex items-center select-none ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="block w-12 h-7 rounded-full bg-gray-300 peer-checked:bg-emerald-500 transition-colors" />
      <span className="absolute top-0.5 right-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:-translate-x-5" />
    </label>
  );
}

function parseAuctionsResponse(res: any) {
  // الشكل المتوقع:
  // { status: "success", data: { current_page, data: [...], last_page, per_page, total, ... } }
  const root = res && typeof res === "object" ? res : {};
  const paginator =
    root?.data && typeof root.data === "object" && Array.isArray(root.data.data) ? root.data : null;

  if (paginator) {
    return {
      items: paginator.data as AuctionApi[],
      meta: {
        currentPage: safeNum(paginator.current_page) || 1,
        lastPage: safeNum(paginator.last_page) || 1,
        perPage: safeNum(paginator.per_page) || 15,
        total: safeNum(paginator.total) || 0,
      },
    };
  }

  // fallback لو رجع Array مباشرة
  const arr = Array.isArray(root?.data) ? root.data : Array.isArray(root) ? root : [];
  return {
    items: arr as AuctionApi[],
    meta: {
      currentPage: 1,
      lastPage: 1,
      perPage: arr.length || 15,
      total: arr.length || 0,
    },
  };
}

function toRow(a: AuctionApi): Row {
  const id = safeNum(a?.id);
  const car = a?.car ?? {};
  const statusRaw = String(a?.status ?? "");
  const statusLabel = a?.status_label ? String(a.status_label) : statusToArabicFallback(statusRaw);

  const imagesList = car?.images_list;
  const imagesCount = Array.isArray(imagesList) ? imagesList.length : null;

  return {
    id,
    carLabel: pickCarLabel(a),
    statusRaw,
    statusLabel,
    currentBid: safeNum(a?.current_bid ?? a?.current_price ?? a?.currentPrice ?? 0),
    reservePrice: safeNum(a?.reserve_price ?? 0),
    minimumBid: safeNum(a?.minimum_bid ?? 0),
    maximumBid: safeMaybeNum(a?.maximum_bid),
    startAt: a?.start_time ?? null,
    endAt: a?.end_time ?? null,
    auctionType: a?.auction_type ?? null,
    approvedForLive: typeof a?.approved_for_live === "boolean" ? a.approved_for_live : null,
    controlRoomApproved:
      typeof a?.control_room_approved === "boolean" ? a.control_room_approved : null,
    carVin: car?.vin ?? null,
    carImagesCount: imagesCount,
    raw: a,
  };
}

export function AuctionsPanel() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [rows, setRows] = useState<Row[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterApprovedLive, setFilterApprovedLive] = useState<string>(""); // "" | "1" | "0"
  const [filterControlRoom, setFilterControlRoom] = useState<string>(""); // "" | "1" | "0"
  const [startDate, setStartDate] = useState<string>(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>(""); // YYYY-MM-DD

  // Sorting
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Editing
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState<any>(null);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.statusRaw && set.add(r.statusRaw));
    // نضيف شوية قيم شائعة
    ["scheduled", "active", "ended", "completed", "failed", "cancelled"].forEach((s) => set.add(s));
    return Array.from(set).filter(Boolean);
  }, [rows]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.auctionType && set.add(String(r.auctionType)));
    return Array.from(set).filter(Boolean).sort();
  }, [rows]);

  async function load(isRefresh = false, nextPage?: number) {
    setError(null);
    setOkMsg(null);

    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const p = nextPage ?? page;

      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("per_page", String(perPage));

      if (search.trim()) params.set("search", search.trim());
      if (filterStatus) params.set("status", filterStatus);
      if (filterType) params.set("auction_type", filterType);
      if (filterApprovedLive)
        params.set("approved_for_live", filterApprovedLive === "1" ? "true" : "false");
      if (filterControlRoom)
        params.set("control_room_approved", filterControlRoom === "1" ? "true" : "false");
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      if (sortBy) params.set("sort_by", sortBy);
      if (sortDir) params.set("sort_dir", sortDir);

      const res: any = await apiFetch(`/admin/auctions?${params.toString()}`);
      const parsed = parseAuctionsResponse(res);

      setRows(parsed.items.map(toRow));
      setPage(parsed.meta.currentPage);
      setLastPage(parsed.meta.lastPage);
      setPerPage(parsed.meta.perPage);
      setTotal(parsed.meta.total);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }

  useEffect(() => {
    load(false, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload عند تغيير الفلاتر (Debounce بسيط)
  useEffect(() => {
    const t = setTimeout(() => {
      load(true, 1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterStatus, filterType, filterApprovedLive, filterControlRoom, startDate, endDate, perPage, sortBy, sortDir]);

  function openEdit(r: Row) {
    setError(null);
    setOkMsg(null);

    setEditing(r);
    setDraft({
      status: r.statusRaw || "scheduled",
      auction_type: r.auctionType || "",
      control_room_approved: Boolean(r.controlRoomApproved ?? false),
      approved_for_live: Boolean(r.approvedForLive ?? false),

      opening_price: r.raw?.opening_price ?? "",
      reserve_price: r.raw?.reserve_price ?? "",
      minimum_bid: r.raw?.minimum_bid ?? "",
      maximum_bid: r.raw?.maximum_bid ?? "",

      start_time: toDatetimeLocal(r.startAt ?? null),
      end_time: toDatetimeLocal(r.endAt ?? null),
    });
  }

  function closeEdit() {
    setEditing(null);
    setDraft(null);
  }

  async function saveEdit() {
    if (!editing || !draft) return;

    setError(null);
    setOkMsg(null);
    setSaving(true);

    try {
      const payload: any = {
        status: draft.status || undefined,
        auction_type: draft.auction_type || undefined,

        control_room_approved: Boolean(draft.control_room_approved),
        approved_for_live: Boolean(draft.approved_for_live),

        opening_price: draft.opening_price === "" ? null : safeMaybeNum(draft.opening_price),
        reserve_price: draft.reserve_price === "" ? undefined : draft.reserve_price,
        minimum_bid: draft.minimum_bid === "" ? undefined : draft.minimum_bid,
        maximum_bid: draft.maximum_bid === "" ? null : safeMaybeNum(draft.maximum_bid),

        start_time: draft.start_time ? fromDatetimeLocal(draft.start_time) : undefined,
        end_time: draft.end_time ? fromDatetimeLocal(draft.end_time) : undefined,
      };

      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      await apiFetch(`/admin/auctions/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setOkMsg("تم حفظ التعديلات ✅");
      closeEdit();
      await load(true);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setFilterStatus("");
    setFilterType("");
    setFilterApprovedLive("");
    setFilterControlRoom("");
    setStartDate("");
    setEndDate("");
    setSortBy("created_at");
    setSortDir("desc");
    setPerPage(15);
  }

  const pageFrom = rows.length ? (page - 1) * perPage + 1 : 0;
  const pageTo = (page - 1) * perPage + rows.length;

  return (
      <div className="min-h-screen bg-gray-50/60 p-4 sm:p-6 lg:p-8" dir="rtl">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">إدارة المزادات</h1>
              <p className="text-sm text-gray-600 mt-1">تابع المزادات وعدّل التفاصيل بسهولة.</p>
            </div>

            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-extrabold disabled:opacity-60"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <ArrowPathIcon className="h-5 w-5" />
              تحديث
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm font-bold">
              {error}
            </div>
          )}
          {okMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm font-bold flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              {okMsg}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Search */}
              <div className="lg:col-span-5">
                <label className="block text-xs font-extrabold text-gray-700 mb-2">بحث</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث باسم السيارة أو VIN..."
                    className="w-full border border-gray-200 rounded-2xl py-3 pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-extrabold text-gray-700 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <FunnelIcon className="h-4 w-4" />
                    الحالة
                  </span>
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">الكل</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {statusToArabicFallback(s)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-extrabold text-gray-700 mb-2">النوع</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">الكل</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Approved */}
              <div className="lg:col-span-1">
                <label className="block text-xs font-extrabold text-gray-700 mb-2">اعتماد</label>
                <select
                  value={filterApprovedLive}
                  onChange={(e) => setFilterApprovedLive(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">الكل</option>
                  <option value="1">نعم</option>
                  <option value="0">لا</option>
                </select>
              </div>

              {/* Control room */}
              <div className="lg:col-span-1">
                <label className="block text-xs font-extrabold text-gray-700 mb-2">تحقق</label>
                <select
                  value={filterControlRoom}
                  onChange={(e) => setFilterControlRoom(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">الكل</option>
                  <option value="1">نعم</option>
                  <option value="0">لا</option>
                </select>
              </div>

              {/* Dates */}
              <div className="lg:col-span-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">من</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">إلى</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              {/* Sorting + per page */}
              <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-3 mt-1">
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">ترتيب حسب</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="created_at">الأحدث</option>
                    <option value="start_time">وقت البداية</option>
                    <option value="end_time">وقت النهاية</option>
                    <option value="current_bid">السعر الحالي</option>
                    <option value="status">الحالة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">الاتجاه</label>
                  <select
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as any)}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="desc">تنازلي</option>
                    <option value="asc">تصاعدي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">عدد العناصر</label>
                  <select
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {[10, 15, 20, 30, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-extrabold"
                    type="button"
                  >
                    مسح الفلاتر
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="mt-6">
              {loading ? (
                <div className="text-gray-500 font-semibold">جاري التحميل...</div>
              ) : rows.length ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-extrabold text-gray-600 uppercase">
                            رقم
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-extrabold text-gray-600 uppercase">
                            السيارة
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-extrabold text-gray-600 uppercase">
                            السعر الحالي
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-extrabold text-gray-600 uppercase">
                            الحالة
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-extrabold text-gray-600 uppercase">
                            بداية / نهاية
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-extrabold text-gray-600 uppercase">
                            اعتماد / تحقق
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-extrabold text-gray-600 uppercase">
                            تعديل
                          </th>
                        </tr>
                      </thead>

                      <tbody className="bg-white divide-y divide-gray-200">
                        {rows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50/60">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-extrabold">
                              #{r.id}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-extrabold text-gray-900">{r.carLabel}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {r.carVin ? `VIN: ${r.carVin}` : "—"}
                                {typeof r.carImagesCount === "number" ? ` • صور: ${r.carImagesCount}` : ""}
                                {r.auctionType ? ` • ${r.auctionType}` : ""}
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-extrabold">
                              {r.currentBid.toLocaleString("ar-EG")} ريال
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge label={r.statusLabel} />
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              <div>{r.startAt ? new Date(r.startAt).toLocaleString("ar-EG") : "—"}</div>
                              <div className="text-xs text-gray-500">
                                {r.endAt ? new Date(r.endAt).toLocaleString("ar-EG") : "—"}
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex flex-col gap-1">
                                <div className="text-xs font-extrabold text-gray-700">
                                  اعتماد:{" "}
                                  <span className={r.approvedForLive ? "text-emerald-700" : "text-gray-500"}>
                                    {r.approvedForLive ? "نعم" : "لا"}
                                  </span>
                                </div>
                                <div className="text-xs font-extrabold text-gray-700">
                                  تحقق:{" "}
                                  <span
                                    className={r.controlRoomApproved ? "text-emerald-700" : "text-gray-500"}
                                  >
                                    {r.controlRoomApproved ? "نعم" : "لا"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => openEdit(r)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-extrabold"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                                تعديل
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm font-bold text-gray-700">
                      {total ? (
                        <>
                          عرض <span className="font-extrabold">{pageFrom}</span> إلى{" "}
                          <span className="font-extrabold">{pageTo}</span> من{" "}
                          <span className="font-extrabold">{total}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => page > 1 && load(true, page - 1)}
                        disabled={page <= 1 || refreshing}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-extrabold disabled:opacity-60"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                        السابق
                      </button>

                      <div className="text-sm font-extrabold text-gray-700 px-2">
                        {page} / {lastPage}
                      </div>

                      <button
                        onClick={() => page < lastPage && load(true, page + 1)}
                        disabled={page >= lastPage || refreshing}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-extrabold disabled:opacity-60"
                      >
                        التالي
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-14">
                  <div className="text-sm font-extrabold text-gray-900">لا توجد نتائج</div>
                  <div className="text-sm text-gray-500 mt-1">جرّب تعديل البحث أو الفلاتر.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {editing && draft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={closeEdit} />

            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold text-gray-900">
                    تعديل مزاد #{editing.id}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{editing.carLabel}</div>
                </div>

                <button
                  onClick={closeEdit}
                  className="p-2 rounded-xl hover:bg-gray-50 border border-gray-200"
                  title="إغلاق"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">الحالة</label>
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft((d: any) => ({ ...d, status: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {statusToArabicFallback(s)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">النوع</label>
                  <input
                    value={draft.auction_type}
                    onChange={(e) => setDraft((d: any) => ({ ...d, auction_type: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="مثال: silent_instant"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">بداية</label>
                  <input
                    type="datetime-local"
                    value={draft.start_time}
                    onChange={(e) => setDraft((d: any) => ({ ...d, start_time: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">نهاية</label>
                  <input
                    type="datetime-local"
                    value={draft.end_time}
                    onChange={(e) => setDraft((d: any) => ({ ...d, end_time: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">سعر افتتاحي</label>
                  <input
                    type="number"
                    min={0}
                    value={draft.opening_price}
                    onChange={(e) => setDraft((d: any) => ({ ...d, opening_price: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">السعر الاحتياطي</label>
                  <input
                    type="number"
                    min={0}
                    value={draft.reserve_price}
                    onChange={(e) => setDraft((d: any) => ({ ...d, reserve_price: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">الحد الأدنى</label>
                  <input
                    type="number"
                    min={0}
                    value={draft.minimum_bid}
                    onChange={(e) => setDraft((d: any) => ({ ...d, minimum_bid: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">الحد الأقصى</label>
                  <input
                    type="number"
                    min={0}
                    value={draft.maximum_bid}
                    onChange={(e) => setDraft((d: any) => ({ ...d, maximum_bid: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="اختياري"
                  />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4 bg-gray-50">
                    <div>
                      <div className="text-sm font-extrabold text-gray-900">اعتماد</div>
                      <div className="text-xs text-gray-500 mt-1">{draft.approved_for_live ? "مفعل" : "غير مفعل"}</div>
                    </div>
                    <Toggle
                      checked={Boolean(draft.approved_for_live)}
                      onChange={(v) => setDraft((d: any) => ({ ...d, approved_for_live: v }))}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4 bg-gray-50">
                    <div>
                      <div className="text-sm font-extrabold text-gray-900">تحقق</div>
                      <div className="text-xs text-gray-500 mt-1">{draft.control_room_approved ? "مفعل" : "غير مفعل"}</div>
                    </div>
                    <Toggle
                      checked={Boolean(draft.control_room_approved)}
                      onChange={(v) => setDraft((d: any) => ({ ...d, control_room_approved: v }))}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-extrabold disabled:opacity-60"
                >
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>

                <button
                  onClick={closeEdit}
                  disabled={saving}
                  className="px-6 py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-extrabold disabled:opacity-60"
                >
                  إلغاء
                </button>
              </div>

              {/* Hidden conversions note: kept out of UI */}
              <input type="hidden" value={fromDatetimeLocal(draft.start_time) ?? ""} readOnly />
              <input type="hidden" value={fromDatetimeLocal(draft.end_time) ?? ""} readOnly />
            </div>
          </div>
        )}
      </div>
  );
}

export default function Auctions() {
  return (
    <Layout>
      <AuctionsPanel />
    </Layout>
  );
}
