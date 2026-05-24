import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Package,
  CreditCard,
  TrendingUp,
  Clock,
  ChevronLeft,
  X,
  Store,
  Truck,
} from "lucide-react";
import ControlRoomGate, { type ControlRoomAccessLevel } from "@/components/control-room/ControlRoomGate";
import ControlRoomShell from "@/components/control-room/ControlRoomShell";
import CrPageHeader from "@/components/control-room/CrPageHeader";
import CrKpiCard from "@/components/control-room/CrKpiCard";
import CrStatusPill from "@/components/control-room/CrStatusPill";

type OrderChannel = "store" | "shipping";

type OrderRow = {
  id: number;
  channel?: OrderChannel;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  status: string;
  payment_status: string;
  total: string | number;
  created_at: string;
  read_only?: boolean;
  store?: { id: number; name: string; name_ar?: string; slug: string; status?: string };
  shipping?: {
    provider_code?: string;
    service_name?: string;
    tracking_number?: string;
    entity_type?: string;
    entity_id?: number;
  };
};

type OrderStats = {
  total_orders: number;
  orders_today: number;
  paid_count: number;
  pending_payment: number;
  paid_revenue: number;
  store_orders?: number;
  shipping_orders?: number;
  shipping_revenue?: number;
};

type Paginated = {
  data: OrderRow[];
  current_page: number;
  last_page: number;
  total: number;
};

const ORDER_STATUS: Record<string, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const CHANNEL_LABEL: Record<OrderChannel, string> = {
  store: "متجر",
  shipping: "شحن",
};

const SHIPPING_STATUS: Record<string, string> = {
  pending: "بانتظار الحجز",
  booked: "محجوز",
  picked_up: "تم الاستلام",
  in_transit: "في الطريق",
  out_for_delivery: "خارج للتسليم",
  delivered: "تم التسليم",
  returned: "مرتجع",
  cancelled: "ملغي",
};

const PAYMENT_STATUS: Record<string, { label: string; tone: "warning" | "ok" | "live" | "muted" }> = {
  pending: { label: "بانتظار الدفع", tone: "warning" },
  paid: { label: "مدفوع", tone: "ok" },
  failed: { label: "فشل", tone: "live" },
  refunded: { label: "مسترد", tone: "muted" },
};

function statusLabel(order: OrderRow) {
  if (order.channel === "shipping") {
    return SHIPPING_STATUS[order.status] ?? order.status;
  }
  return ORDER_STATUS[order.status] ?? order.status;
}

function formatSar(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `${(Number.isFinite(n) ? n : 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function StoreOrdersBody({ access }: { access: ControlRoomAccessLevel }) {
  const canUpdateStatus = access === "full";
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ last_page: 1, total: 0 });
  const [channelFilter, setChannelFilter] = useState<"all" | OrderChannel>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<OrderChannel>("store");
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusDraft, setStatusDraft] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const authHeaders = (): Record<string, string> => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = authHeaders();
      const params = new URLSearchParams({ page: String(page), per_page: "25", channel: channelFilter });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (paymentFilter !== "all") params.set("payment_status", paymentFilter);

      const [listRes, statsRes] = await Promise.allSettled([
        fetch(`/api/stores/orders/list?${params}`, { headers }).then((r) => r.json()),
        fetch(`/api/stores/orders/stats?channel=${channelFilter}`, { headers }).then((r) => r.json()),
      ]);

      if (listRes.status === "fulfilled" && listRes.value.status === "success") {
        const payload = listRes.value.data as Paginated;
        setOrders(payload.data ?? []);
        setPagination({ last_page: payload.last_page ?? 1, total: payload.total ?? 0 });
      }
      if (statsRes.status === "fulfilled" && statsRes.value.status === "success") {
        setStats(statsRes.value.data);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, paymentFilter, channelFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: number, channel: OrderChannel = "store") => {
    setSelectedId(id);
    setSelectedChannel(channel);
    setDetailLoading(true);
    setDetail(null);
    setStatusError(null);
    setStatusNote("");
    try {
      const res = await fetch(`/api/stores/orders/${id}?channel=${channel}`, { headers: authHeaders() });
      const json = await res.json();
      if (json.status === "success") {
        setDetail(json.data);
        setStatusDraft(String(json.data.status ?? "pending"));
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const saveStatus = async () => {
    if (!selectedId || !canUpdateStatus || selectedChannel !== "store") return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/stores/orders/${selectedId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: statusDraft, note: statusNote || undefined }),
      });
      const json = await res.json();
      if (json.status !== "success") {
        setStatusError(json.message ?? "تعذّر تحديث الحالة");
        return;
      }
      setDetail(json.data);
      setStatusDraft(String(json.data.status ?? statusDraft));
      setStatusNote("");
      void load();
    } catch {
      setStatusError("خطأ في الاتصال");
    } finally {
      setStatusSaving(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <CrPageHeader
        icon={ShoppingCart}
        title="طلبات موحّدة"
        subtitle="متاجر داسم + شحن (M1.2) — قراءة موحّدة مع تحديث حالة طلبات المتاجر فقط"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/control-room/stores"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Store className="w-4 h-4" />
              المتاجر
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
          </div>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <CrKpiCard title="إجمالي الطلبات" value={stats.total_orders} icon={Package} tone="indigo" loading={loading} />
          <CrKpiCard title="اليوم" value={stats.orders_today} icon={Clock} tone="blue" loading={loading} />
          {channelFilter !== "shipping" && (
            <CrKpiCard title="متاجر — مدفوعة" value={stats.paid_count} icon={CreditCard} tone="emerald" loading={loading} />
          )}
          {channelFilter !== "shipping" && (
            <CrKpiCard title="بانتظار الدفع" value={stats.pending_payment} icon={ShoppingCart} tone="amber" loading={loading} />
          )}
          {channelFilter !== "store" && typeof stats.shipping_orders === "number" && (
            <CrKpiCard title="طلبات شحن" value={stats.shipping_orders} icon={Truck} tone="blue" loading={loading} />
          )}
          <CrKpiCard
            title={channelFilter === "shipping" ? "إيراد الشحن" : "إيراد مدفوع"}
            value={formatSar(channelFilter === "shipping" ? (stats.shipping_revenue ?? stats.paid_revenue) : stats.paid_revenue)}
            icon={TrendingUp}
            tone="purple"
            loading={loading}
          />
        </div>
      )}

      <div className="cr-filter-bar">
        <select
          value={channelFilter}
          onChange={(e) => {
            setChannelFilter(e.target.value as "all" | OrderChannel);
            setPage(1);
          }}
          aria-label="مصدر الطلب"
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">كل المصادر</option>
          <option value="store">متاجر داسم</option>
          <option value="shipping">شحن</option>
        </select>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="رقم الطلب، عميل، متجر…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="حالة الطلب"
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">كل حالات الطلب</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value);
            setPage(1);
          }}
          aria-label="حالة الدفع"
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">كل حالات الدفع</option>
          {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{pagination.total} طلب</span>
      </div>

      <div className="cr-table-wrap">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">جاري تحميل الطلبات…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="cr-empty m-4">
            <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            لا توجد طلبات مطابقة — أو لم يُسجَّل أي طلب بعد على المتاجر
          </div>
        ) : (
          <table className="w-full min-w-[980px] text-sm">
            <thead className="cr-table-head">
              <tr>
                <th className="px-4 py-3 text-right font-semibold">المصدر</th>
                <th className="px-4 py-3 text-right font-semibold">رقم الطلب</th>
                <th className="px-4 py-3 text-right font-semibold">المتجر / الناقل</th>
                <th className="px-4 py-3 text-right font-semibold">العميل</th>
                <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                <th className="px-4 py-3 text-right font-semibold">الدفع</th>
                <th className="px-4 py-3 text-right font-semibold">الإجمالي</th>
                <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const channel = order.channel ?? "store";
                const pay = PAYMENT_STATUS[order.payment_status] ?? { label: order.payment_status, tone: "muted" as const };
                return (
                  <tr
                    key={`${channel}-${order.id}`}
                    className="cr-table-row cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    onClick={() => void openDetail(order.id, channel)}
                  >
                    <td className="px-4 py-3">
                      <CrStatusPill tone={channel === "shipping" ? "info" : "ok"}>
                        {CHANNEL_LABEL[channel]}
                      </CrStatusPill>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {channel === "store" ? order.store?.name ?? "—" : order.shipping?.provider_code ?? "شحن داسم"}
                      </p>
                      {channel === "store" && order.store?.slug ? (
                        <p className="text-xs text-slate-400">/{order.store.slug}</p>
                      ) : order.shipping?.tracking_number ? (
                        <p className="text-xs text-slate-400 font-mono">{order.shipping.tracking_number}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p>{order.customer_name}</p>
                      <p className="text-xs text-slate-400">{order.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <CrStatusPill tone="info">{statusLabel(order)}</CrStatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <CrStatusPill tone={pay.tone}>{pay.label}</CrStatusPill>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatSar(order.total)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(order.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pagination.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-sm text-slate-500">
            {page} / {pagination.last_page}
          </span>
          <button
            type="button"
            disabled={page >= pagination.last_page || loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}

      {selectedId !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={closeDetail}>
          <div
            className="cr-panel w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ChevronLeft className="w-5 h-5" />
                تفاصيل الطلب
              </h2>
              <button type="button" onClick={closeDetail} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>
            {detailLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mx-auto my-8" />
            ) : detail ? (
              <div className="space-y-4 text-sm">
                <p>
                  <span className="text-slate-500">المصدر:</span>{" "}
                  {CHANNEL_LABEL[(detail.channel as OrderChannel) ?? selectedChannel]}
                </p>
                <p>
                  <span className="text-slate-500">رقم الطلب:</span>{" "}
                  <span className="font-mono font-semibold">{String(detail.order_number)}</span>
                </p>
                <p>
                  <span className="text-slate-500">الحالة:</span>{" "}
                  {statusLabel({
                    channel: (detail.channel as OrderChannel) ?? selectedChannel,
                    status: String(detail.status),
                  } as OrderRow)}
                </p>
                <p>
                  <span className="text-slate-500">الإجمالي:</span> {formatSar(detail.total as string | number)}
                </p>
                <p>
                  <span className="text-slate-500">العميل:</span> {String(detail.customer_name)} — {String(detail.customer_phone)}
                </p>
                {selectedChannel === "shipping" && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-1">
                    <p className="font-semibold">تفاصيل الشحن</p>
                    {detail.provider_code ? <p>الناقل: {String(detail.provider_code)}</p> : null}
                    {detail.service_name ? <p>الخدمة: {String(detail.service_name)}</p> : null}
                    {detail.tracking_number ? (
                      <p>
                        التتبع: <span className="font-mono">{String(detail.tracking_number)}</span>
                      </p>
                    ) : null}
                    {detail.entity_type ? (
                      <p>
                        مرتبط بـ: {String(detail.entity_type)} #{String(detail.entity_id ?? "—")}
                      </p>
                    ) : null}
                    {detail.label_url ? (
                      <a href={String(detail.label_url)} target="_blank" rel="noreferrer" className="text-emerald-600 underline text-xs">
                        بوليصة الشحن
                      </a>
                    ) : null}
                  </div>
                )}
                {Array.isArray(detail.items) && detail.items.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">البنود</p>
                    <ul className="space-y-2">
                      {(detail.items as Array<{ product_name: string; quantity: number; total_price: string | number }>).map((item, i) => (
                        <li key={i} className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                          <span>
                            {item.product_name} × {item.quantity}
                          </span>
                          <span>{formatSar(item.total_price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {canUpdateStatus && selectedChannel === "store" && !detail.read_only && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                    <p className="font-semibold text-sm">تحديث الحالة</p>
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                      aria-label="حالة الطلب الجديدة"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      {Object.entries(ORDER_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="ملاحظة اختيارية (تُسجَّل في audit log)"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    {statusError ? <p className="text-xs text-red-600">{statusError}</p> : null}
                    <button
                      type="button"
                      disabled={statusSaving}
                      onClick={() => void saveStatus()}
                      className="w-full rounded-lg bg-emerald-600 text-white py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {statusSaving ? "جاري الحفظ…" : "حفظ الحالة"}
                    </button>
                  </div>
                )}
                {Array.isArray(detail.status_logs) && detail.status_logs.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">سجل تغييرات الحالة</p>
                    <ul className="space-y-2 text-xs">
                      {(detail.status_logs as Array<{ from_status?: string; to_status: string; note?: string; created_at: string }>).map(
                        (log, i) => (
                          <li key={i} className="border-b border-slate-100 dark:border-slate-700 pb-2">
                            <span className="font-mono">
                              {log.from_status ? `${log.from_status} → ` : ""}
                              {log.to_status}
                            </span>
                            {log.note ? <span className="text-slate-500"> — {log.note}</span> : null}
                            <p className="text-slate-400">{formatDate(log.created_at)}</p>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">تعذّر تحميل التفاصيل</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ControlRoomStoreOrdersPage() {
  return (
    <ControlRoomGate>
      {(access) => (
        <ControlRoomShell access={access}>
          <StoreOrdersBody access={access} />
        </ControlRoomShell>
      )}
    </ControlRoomGate>
  );
}
