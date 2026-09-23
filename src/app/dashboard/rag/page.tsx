"use client";

import * as React from "react";
import { UploadCloud, FileText, Trash2, Search, Cpu, CheckCircle, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";

interface DocumentItem {
  id: string;
  name: string;
  preview: string;
  chunks: number;
  createdAt: string;
}

export default function DocumentCenterPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Search Test State
  const [testQuery, setTestQuery] = React.useState("");
  const [isQuerying, setIsQuerying] = React.useState(false);
  const [queryResults, setQueryResults] = React.useState<any[]>([]);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [isReindexing, setIsReindexing] = React.useState(false);
  const [reindexMessage, setReindexMessage] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const fetchDocuments = React.useCallback(async () => {
    try {
      const res = await fetch("/api/rag/upload");
      if (res.status === 401) {
        // Don't render an empty knowledge base as if it were real — that hid
        // the expired-session problem behind "No documents uploaded yet".
        window.location.replace("/login?redirect=/dashboard/rag");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to fetch RAG documents", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (doc: DocumentItem) => {
    if (!window.confirm(`Delete "${doc.name}" and its ${doc.chunks} chunks from the knowledge base?`)) return;
    setDeletingId(doc.id);
    try {
      const res = await fetch("/api/rag/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete document");
      fetchDocuments();
    } catch (err) {
      alert("Error deleting document: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingId(null);
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    setReindexMessage(null);
    try {
      const res = await fetch("/api/rag/reindex", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reindex failed");
      setReindexMessage(
        `✓ Rebuilt ${data.reindexed}/${data.total} embeddings · index ${data.vector_index}`
      );
      fetchDocuments();
    } catch (err) {
      setReindexMessage("✗ " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsReindexing(false);
      setTimeout(() => setReindexMessage(null), 8000);
    }
  };

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);

      setUploadProgress(50);

      const res = await fetch("/api/rag/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(85);
      // Read as text first: a Vercel gateway/timeout page is HTML, and calling
      // `res.json()` on it throws a confusing "Unexpected token" error.
      const raw = await res.text();
      let data: { error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        /* non-JSON error page — handled via the status below */
      }

      if (!res.ok) {
        if (res.status === 401) throw new Error("Session expired — log in again, then retry.");
        throw new Error(
          data.error ||
            `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""} (non-JSON error page)`,
        );
      }

      setUploadProgress(100);
      fetchDocuments();
    } catch (err: any) {
      alert("Error uploading document: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTestQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsQuerying(true);
    setQueryResults([]);

    try {
      const res = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: testQuery, topK: 3 }),
      });
      const data = await res.json();
      if (res.ok) {
        setQueryResults(data.results || []);
      }
    } catch (err) {
      console.error("Test query error:", err);
    } finally {
      setIsQuerying(false);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        {/* Header Title */}
        <div className="space-y-1">
          <h2 className="font-h1 font-bold text-foreground">Knowledge base (RAG Center)</h2>
          <p className="text-xs text-muted">
            Ingest corporate manuals, support document libraries, and API specifications using
            local MiniLM embeddings stored in MongoDB Atlas Vector Search.
          </p>
        </div>

        {/* Top metrics grids */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Total Knowledge files</span>
              <div className="text-xl font-extrabold text-foreground">{loading ? "..." : documents.length}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
              <FileText className="h-4.5 w-4.5" />
            </div>
          </Card>
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Vector Chunks Indexed</span>
              <div className="text-xl font-extrabold text-foreground">
                {documents.reduce((acc, doc) => acc + doc.chunks, 0)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
              <Cpu className="h-4.5 w-4.5" />
            </div>
          </Card>
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Embedding Provider</span>
              <div className="text-sm font-extrabold text-emerald-400">Local MiniLM-L6-v2 (384-d)</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
          </Card>
        </div>

        {/* Upload Area & Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Ingest Form & Query Tester */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Ingest Documents</h3>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.pdf,.md"
                className="hidden"
              />

              <div
                className="border-2 border-dashed border-border hover:border-accent/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-surface-light/20 bg-surface/30 group"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="h-10 w-10 text-muted group-hover:text-accent transition-colors mb-3" />
                <span className="text-xs font-bold text-foreground">Click to upload document</span>
                <span className="text-[10px] text-muted mt-1">Supports PDF, TXT, MD files</span>
              </div>

              {isUploading && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-accent">Generating vector embeddings...</span>
                    <span className="font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Rebuild embeddings with the current model / vector index */}
              <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                <Button
                  variant="ghost"
                  onClick={handleReindex}
                  disabled={isReindexing || documents.length === 0}
                  className="w-full text-xs"
                  isLoading={isReindexing}
                >
                  Rebuild Embeddings
                </Button>
                <p className="text-[10px] text-muted leading-relaxed">
                  Re-embeds stored chunks with the current model and repairs the Atlas vector
                  index. Use after changing the embedding model — no re-upload needed.
                </p>
                {reindexMessage && (
                  <div
                    className={`text-[10px] p-2 rounded ${
                      reindexMessage.startsWith("✓")
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {reindexMessage}
                  </div>
                )}
              </div>
            </Card>

            {/* Test Semantic Vector Retriever */}
            <Card className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Test Vector Search Retriever
              </h3>
              <form onSubmit={handleTestQuery} className="space-y-3">
                <input
                  type="text"
                  placeholder="Ask a question about your files..."
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                />
                <Button type="submit" isLoading={isQuerying} className="w-full text-xs">
                  Search Vector Store
                </Button>
              </form>

              {queryResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-bold text-muted uppercase">Top Vector Matches:</span>
                  {queryResults.map((r, i) => (
                    <div key={i} className="p-2.5 bg-surface/50 border border-border/60 rounded text-[11px] space-y-1">
                      <div className="flex justify-between text-[10px] text-emerald-400 font-bold">
                        <span>Result #{i + 1}</span>
                        <span>{(r.similarity * 100).toFixed(1)}% Match</span>
                      </div>
                      <p className="text-muted leading-tight">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Catalog list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-h3 font-bold text-foreground">Ingested Document Repository</h3>

              <div className="max-w-xs w-full relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  placeholder="Search database..."
                  className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-semibold text-xs text-foreground/90 max-w-[180px] truncate">
                        {doc.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted max-w-[220px] truncate">
                        {doc.preview || "No preview"}
                      </TableCell>
                      <TableCell className="text-xs text-muted font-medium">{doc.chunks}</TableCell>
                      <TableCell>
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={deletingId === doc.id}
                          onClick={() => handleDelete(doc)}
                          aria-label={`Delete ${doc.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDocs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted">
                        {loading ? "Loading knowledge base..." : "No documents uploaded yet. Upload a file on the left panel."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
