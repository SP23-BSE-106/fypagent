"use client";

import * as React from "react";
import { UploadCloud, FileText, Trash2, Search, Cpu, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";

export default function DocumentCenterPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [documents, setDocuments] = React.useState([
    { name: "Company_Product_Manual_2026.pdf", size: "4.2 MB", chunks: 142, status: "Active", uploaded: "2 hours ago" },
    { name: "Refund_Policy_Rules.txt", size: "12 KB", chunks: 8, status: "Active", uploaded: "1 day ago" },
    { name: "FAQ_Customer_Escalations.md", size: "48 KB", chunks: 19, status: "Active", uploaded: "3 days ago" },
    { name: "API_Endpoints_Specifications.pdf", size: "1.8 MB", chunks: 64, status: "Active", uploaded: "5 days ago" }
  ]);

  const handleUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setDocuments((prevDocs) => [
            {
              name: "User_Credentials_Guidelines.pdf",
              size: "1.4 MB",
              chunks: 38,
              status: "Active",
              uploaded: "Just now"
            },
            ...prevDocs
          ]);
          return 100;
        }
        return prev + 25;
      });
    }, 300);
  };

  const handleDelete = (name: string) => {
    setDocuments((prevDocs) => prevDocs.filter((doc) => doc.name !== name));
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
            Ingest corporate manuals, support document libraries, and API specifications. Uploaded files are segmented into vector tokens and indexed in the DB.
          </p>
        </div>

        {/* Top metrics grids */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Total Knowledge files</span>
              <div className="text-xl font-extrabold text-foreground">{documents.length}</div>
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
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Total DB Disk Size</span>
              <div className="text-xl font-extrabold text-foreground">7.4 MB</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
              <RefreshCw className="h-4.5 w-4.5" />
            </div>
          </Card>
        </div>

        {/* Upload Area & Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Ingest Form */}
          <Card className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Ingest Documents</h3>
            
            <div
              className="border-2 border-dashed border-border hover:border-accent/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-surface-light/20 bg-surface/30 group"
              onClick={handleUpload}
            >
              <UploadCloud className="h-10 w-10 text-muted group-hover:text-accent transition-colors mb-3" />
              <span className="text-xs font-bold text-foreground">Click to upload files</span>
              <span className="text-[10px] text-muted mt-1">Supports PDF, TXT, MD up to 20MB</span>
            </div>

            {isUploading && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-accent">Embedding text vector chunks...</span>
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

            <div className="border border-border/60 rounded-lg p-4 mt-6 bg-[#0B0F14]/40 flex gap-3 text-[11px] text-muted">
              <AlertCircle className="h-5 w-5 text-accent flex-shrink-0" />
              <p className="leading-normal">
                Chunk size defaults to 512 characters with a 10% overlap to preserve semantic flow. Models query these vectors via cosine similarity lookups.
              </p>
            </div>
          </Card>

          {/* Catalog list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-h3 font-bold text-foreground">Ingested Document Repository</h3>
              
              <div className="max-w-xs w-full relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  placeholder="Search index database..."
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
                    <TableHead>Size</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => (
                    <TableRow key={doc.name}>
                      <TableCell className="font-semibold text-xs text-foreground/90 max-w-[200px] truncate">
                        {doc.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted font-medium">{doc.size}</TableCell>
                      <TableCell className="text-xs text-muted font-medium">{doc.chunks}</TableCell>
                      <TableCell>
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted">{doc.uploaded}</TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleDelete(doc.name)}
                          className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDocs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted">
                        No index records found. Upload a file on the left side panel.
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
