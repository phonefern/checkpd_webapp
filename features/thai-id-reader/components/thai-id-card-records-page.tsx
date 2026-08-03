"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Eye, Link2, Search, Unlink } from "lucide-react";

import SidebarLayout from "@/app/component/layout/SidebarLayout";
import { useAccessProfile } from "@/app/hooks/useAccessProfile";
import { useSession } from "@/app/providers/SessionProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CardRecord = {
  thai_id: string;
  user_id: string | null;
  full_name_th: string | null;
  full_name_en: string | null;
  date_of_birth: string | null;
  gender: "M" | "F" | null;
  last_scanned_at: string;
  linked_at: string | null;
  match_count: number;
  total_count: number;
};

type Candidate = { id: string; thai_id: string | null; first_name: string | null; last_name: string | null; phone_number: string | null };
type CardDetail = CardRecord & { address: string | null; photo_base64_uri: string | null; issue_date: string | null; expire_date: string | null; card_issuer: string | null };
type Filter = "all" | "linked" | "unlinked" | "needs_review";

function formatDate(value: string) {
  return new Date(value).toLocaleString("th-TH");
}

function statusFor(row: CardRecord) {
  if (row.user_id) return { label: "Linked", variant: "default" as const };
  if (row.match_count > 1) return { label: "Needs review", variant: "secondary" as const };
  return { label: "Awaiting registration", variant: "outline" as const };
}

export function ThaiIdCardRecordsPage() {
  const { session } = useSession();
  const { accessProfile, accessLoading } = useAccessProfile(session);
  const [rows, setRows] = useState<CardRecord[]>([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const token = session?.access_token;
  const isAllowed = accessProfile.role === "admin" || accessProfile.role === "super_admin";

  const loadRows = useCallback(async () => {
    if (!token || !isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ search: submittedSearch, filter, page: String(page), limit: "25" });
      const response = await fetch(`/api/thai-id-reader/records?${query}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json() as { rows?: CardRecord[]; total?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load card records.");
      setRows(payload.rows ?? []);
      setTotal(payload.total ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load card records.");
    } finally {
      setLoading(false);
    }
  }, [filter, isAllowed, page, submittedSearch, token]);

  useEffect(() => { void loadRows(); }, [loadRows]);

  const openDetail = async (thaiId: string) => {
    if (!token) return;
    setDetailOpen(true);
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/thai-id-reader/records/${thaiId}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json() as { card?: CardDetail; candidates?: Candidate[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load this card record.");
      setDetail(payload.card ?? null);
      setCandidates(payload.candidates ?? []);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Unable to load this card record.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateLink = async (userId: string | null) => {
    if (!token || !detail) return;
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/thai-id-reader/records/${detail.thai_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to update the link.");
      await openDetail(detail.thai_id);
      await loadRows();
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Unable to update the link.");
      setDetailLoading(false);
    }
  };

  return <SidebarLayout activePath="/pages/thai-id-reader/records" mainClassName="bg-gray-50">
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4339C6]/10 text-[#4339C6]"><CreditCard className="h-6 w-6" /></div><div><h1 className="text-xl font-semibold md:text-2xl">Thai ID Card Records</h1><p className="text-sm text-muted-foreground">Saved entrance scans, with safe links to exactly matched registered users.</p></div></div>
      {!accessLoading && !isAllowed ? <Card><CardContent className="p-6 text-sm text-muted-foreground">This page is available only to administrators.</CardContent></Card> : <>
        <Card className="rounded-2xl shadow-sm"><CardContent className="flex flex-wrap gap-3 p-4"><form className="flex min-w-64 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); setPage(1); setSubmittedSearch(search); }}><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Thai ID or name" /><Button type="submit"><Search className="mr-2 h-4 w-4" />Search</Button></form><Select value={filter} onValueChange={(value: Filter) => { setFilter(value); setPage(1); }}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All records</SelectItem><SelectItem value="linked">Linked</SelectItem><SelectItem value="unlinked">Awaiting registration</SelectItem><SelectItem value="needs_review">Needs review</SelectItem></SelectContent></Select></CardContent></Card>
        {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        <Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Saved card scans</CardTitle><CardDescription>{total.toLocaleString()} record{total === 1 ? "" : "s"}. A duplicate Thai ID scan updates its existing record.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>Thai ID</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Last scanned</TableHead><TableHead /></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading records…</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No card records found.</TableCell></TableRow> : rows.map((row) => { const status = statusFor(row); return <TableRow key={row.thai_id}><TableCell className="font-mono text-xs">{row.thai_id}</TableCell><TableCell>{row.full_name_th || row.full_name_en || "-"}</TableCell><TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs">{formatDate(row.last_scanned_at)}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => void openDetail(row.thai_id)}><Eye className="mr-2 h-4 w-4" />View</Button></TableCell></TableRow>; })}</TableBody></Table></div><div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>Page {page}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || page * 25 >= total} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div></CardContent></Card>
      </>}
    </div>
    <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Thai ID card record</DialogTitle><DialogDescription>{detail?.thai_id ?? "Loading card record…"}</DialogDescription></DialogHeader>{detailLoading && !detail ? <p className="text-sm text-muted-foreground">Loading…</p> : detail ? <div className="space-y-5"><div className="flex flex-wrap gap-5">{detail.photo_base64_uri ? <img src={detail.photo_base64_uri} alt="Thai ID card holder" className="h-32 w-28 rounded-lg border object-cover" /> : null}<div className="space-y-1 text-sm"><p className="font-semibold">{detail.full_name_th || detail.full_name_en || "-"}</p><p>Birth date: {detail.date_of_birth || "-"}</p><p>Card validity: {detail.issue_date || "-"} – {detail.expire_date || "-"}</p><p className="max-w-xl text-muted-foreground">{detail.address || "No address on card"}</p></div></div><div className="rounded-xl border p-4"><p className="mb-3 font-medium">Registered-user link</p>{detail.user_id ? <div className="flex flex-wrap items-center gap-3 text-sm"><Badge>Linked to {detail.user_id}</Badge><Button size="sm" variant="outline" disabled={detailLoading} onClick={() => void updateLink(null)}><Unlink className="mr-2 h-4 w-4" />Unlink</Button></div> : candidates.length === 1 ? <div className="flex flex-wrap items-center gap-3 text-sm"><span>Exact Thai ID match: {candidates[0].first_name || ""} {candidates[0].last_name || ""}</span><Button size="sm" disabled={detailLoading} onClick={() => void updateLink(candidates[0].id)}><Link2 className="mr-2 h-4 w-4" />Link user</Button></div> : candidates.length > 1 ? <p className="text-sm text-muted-foreground">Multiple existing users have this Thai ID. Resolve the duplicate user records before linking.</p> : <p className="text-sm text-muted-foreground">No registered user has this exact Thai ID yet.</p>}</div></div> : null}</DialogContent></Dialog>
  </SidebarLayout>;
}
