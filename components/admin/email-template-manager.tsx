"use client";

import { useState, useEffect, useTransition } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  LayoutTemplate,
  Search,
  Eye,
  Code,
  Info,
  RotateCcw,
  Save,
  Loader2,
  Monitor,
  Smartphone,
  Sparkles,
  ChevronRight,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getMutationErrorMessage } from "@/lib/auth-errors";
import { cn } from "@/lib/utils";

interface EmailTemplateManagerProps {
  token: string;
}

// Ordered category list for consistent sidebar display
const CATEGORY_ORDER = [
  "Auth & Account",
  "Auction Lifecycle",
  "Buy Now",
  "Payments",
  "Order Lifecycle",
  "Cancellations & Refunds",
  "Disputes",
  "Wallet",
];

const CATEGORY_ICONS: Record<string, string> = {
  "Auth & Account": "🔐",
  "Auction Lifecycle": "🏷️",
  "Buy Now": "⚡",
  "Payments": "💳",
  "Order Lifecycle": "📦",
  "Cancellations & Refunds": "↩️",
  "Disputes": "⚖️",
  "Wallet": "👛",
};

export function EmailTemplateManager({ token }: EmailTemplateManagerProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmailType, setSelectedEmailType] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState("preview");
  const [isPending, startTransition] = useTransition();
  const [isSeeding, setIsSeeding] = useState(false);

  // Edit state
  const [editedSubject, setEditedSubject] = useState("");
  const [editedHtml, setEditedHtml] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Queries
  const listData = useQuery(api.emailTemplates.listEmailTemplates, { token });
  const selectedTemplate = useQuery(
    api.emailTemplates.getEmailTemplate,
    selectedEmailType ? { token, emailType: selectedEmailType } : "skip"
  );

  // Mutations
  const seedTemplates = useMutation(api.emailTemplates.seedEmailTemplates);
  const updateTemplate = useMutation(api.emailTemplates.updateEmailTemplate);
  const revertTemplate = useMutation(api.emailTemplates.revertEmailTemplate);

  // Sync edit fields when selected template changes
  useEffect(() => {
    if (selectedTemplate) {
      setEditedSubject(selectedTemplate.currentSubject);
      setEditedHtml(selectedTemplate.currentBodyHtml);
      setIsDirty(false);
    }
  }, [selectedTemplate?.emailType, selectedTemplate?.currentSubject, selectedTemplate?.currentBodyHtml]);

  // Auto-select first template on load
  useEffect(() => {
    if (listData?.groups && listData.groups.length > 0 && !selectedEmailType) {
      const firstGroup = listData.groups[0];
      if (firstGroup.templates.length > 0) {
        setSelectedEmailType(firstGroup.templates[0].emailType);
      }
    }
  }, [listData, selectedEmailType]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const result = await seedTemplates({ token });
      toast({
        title: "Templates Seeded!",
        description: `${result.created} created, ${result.updated} refreshed — ${result.total} templates total.`,
      });
    } catch (err: any) {
      toast({
        title: "Seed Failed",
        description: getMutationErrorMessage(err, "An error occurred"),
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!selectedEmailType) return;
    startTransition(async () => {
      try {
        await updateTemplate({
          token,
          emailType: selectedEmailType,
          currentSubject: editedSubject,
          currentBodyHtml: editedHtml,
        });
        setIsDirty(false);
        toast({
          title: "Template Saved",
          description: "Your changes are now active and will apply to all future emails of this type.",
        });
      } catch (err: any) {
        toast({
          title: "Save Failed",
          description: getMutationErrorMessage(err, "An error occurred"),
          variant: "destructive",
        });
      }
    });
  };

  const handleRevert = async () => {
    if (!selectedEmailType) return;
    startTransition(async () => {
      try {
        await revertTemplate({ token, emailType: selectedEmailType });
        toast({
          title: "Template Reverted",
          description: "The template has been reset to its code-generated default.",
        });
      } catch (err: any) {
        toast({
          title: "Revert Failed",
          description: getMutationErrorMessage(err, "An error occurred"),
          variant: "destructive",
        });
      }
    });
  };

  // Filtered groups
  const filteredGroups = listData?.groups
    ?.map((group) => ({
      ...group,
      templates: searchQuery.trim()
        ? group.templates.filter(
            (t: any) =>
              t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.emailType.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : group.templates,
    }))
    .filter((g) => g.templates.length > 0);

  const isNotSeeded = listData?.isSeeded === false;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <LayoutTemplate className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Email Template Manager
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Preview, edit, and customise all 21 transactional email templates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats pills */}
          {listData && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-muted/60 border border-border text-muted-foreground font-medium">
                {listData.totalCount} templates
              </span>
              {listData.customizedCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-medium">
                  {listData.customizedCount} customised
                </span>
              )}
            </div>
          )}

          {/* Seed button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSeed}
            disabled={isSeeding}
            className="border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 font-semibold"
          >
            {isSeeding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            {isSeeding ? "Seeding…" : listData?.isSeeded ? "Refresh Defaults" : "Seed Templates"}
          </Button>
        </div>
      </div>

      {/* Not Seeded Banner */}
      {isNotSeeded && (
        <div className="flex items-center gap-4 p-5 rounded-xl border border-amber-500/40 bg-amber-500/5">
          <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-600 dark:text-amber-400">Templates not yet seeded</p>
            <p className="text-sm text-muted-foreground">
              Click <strong>Seed Templates</strong> to populate all 21 email templates from their code defaults.
              You can then preview and customise each one.
            </p>
          </div>
          <Button size="sm" onClick={handleSeed} disabled={isSeeding} className="ml-auto bg-amber-500 hover:bg-amber-600 text-white">
            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Seed Now"}
          </Button>
        </div>
      )}

      {/* Main Split-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── Left Sidebar: Template List ─────────────────────── */}
        <Card className="lg:col-span-4 border-border/80 bg-card overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>

          {/* Grouped list */}
          <div className="max-h-[680px] overflow-y-auto">
            {!listData && (
              <div className="flex items-center justify-center p-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading…
              </div>
            )}

            {listData && filteredGroups?.length === 0 && (
              <div className="text-center py-12 px-4 text-sm text-muted-foreground">
                No templates match your search.
              </div>
            )}

            {filteredGroups?.map((group) => (
              <div key={group.category}>
                {/* Category Header */}
                <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-4 py-2.5 border-b border-border/40 flex items-center gap-2">
                  <span className="text-sm">{CATEGORY_ICONS[group.category] || "📧"}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {group.category}
                  </span>
                </div>

                {/* Templates in group */}
                {group.templates.map((tpl: any) => {
                  const isSelected = selectedEmailType === tpl.emailType;
                  return (
                    <button
                      key={tpl.emailType}
                      onClick={() => setSelectedEmailType(tpl.emailType)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border/30 transition-all duration-150 flex items-center justify-between gap-2 group",
                        isSelected
                          ? "bg-violet-500/8 border-l-2 border-l-violet-500"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "text-sm font-semibold truncate",
                            isSelected ? "text-violet-600 dark:text-violet-400" : "text-foreground"
                          )}>
                            {tpl.displayName}
                          </p>
                          {tpl.isCustomized && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 flex-shrink-0"
                            >
                              Edited
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {tpl.description}
                        </p>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 flex-shrink-0 transition-colors",
                        isSelected ? "text-violet-500" : "text-muted-foreground/40 group-hover:text-muted-foreground"
                      )} />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        {/* ── Right Pane: Detail Studio ────────────────────────── */}
        <Card className="lg:col-span-8 p-6 border-border/80 bg-card space-y-5">
          {!selectedTemplate && !selectedEmailType && (
            <div className="flex flex-col items-center justify-center h-[560px] text-center p-8">
              <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                <LayoutTemplate className="h-8 w-8 text-violet-500/60" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Select a Template</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2">
                Choose any template from the list to preview its design, edit the subject line
                or HTML, and save your changes.
              </p>
              {isNotSeeded && (
                <Button onClick={handleSeed} disabled={isSeeding} className="mt-6 bg-violet-600 hover:bg-violet-700 text-white">
                  <Database className="h-4 w-4 mr-2" /> Seed Templates First
                </Button>
              )}
            </div>
          )}

          {selectedEmailType && !selectedTemplate && (
            <div className="flex items-center justify-center h-[560px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {selectedTemplate && (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono bg-muted/60 px-2 py-0.5 rounded text-muted-foreground">
                      {selectedTemplate.emailType}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                      {selectedTemplate.category}
                    </span>
                    {selectedTemplate.isCustomized ? (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
                        <Sparkles className="h-3 w-3 mr-1" /> Customised
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Using Default
                      </Badge>
                    )}
                    {isDirty && (
                      <Badge variant="outline" className="text-xs bg-orange-500/10 border-orange-500/30 text-orange-600">
                        Unsaved changes
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{selectedTemplate.displayName}</h2>
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedTemplate.isCustomized && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRevert}
                      disabled={isPending}
                      className="border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
                      Revert to Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isPending || !isDirty}
                    className={cn(
                      "font-semibold transition-all",
                      isDirty
                        ? "bg-violet-600 hover:bg-violet-700 text-white shadow-md"
                        : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    Save Changes
                  </Button>
                </div>
              </div>

              {/* Subject Line Editor */}
              <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
                <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                  <span>Subject Line</span>
                  {selectedTemplate.isCustomized && (
                    <span className="text-[11px] text-muted-foreground font-normal italic">
                      Default: <span className="font-mono">{selectedTemplate.defaultSubject}</span>
                    </span>
                  )}
                </label>
                <Input
                  value={editedSubject}
                  onChange={(e) => { setEditedSubject(e.target.value); setIsDirty(true); }}
                  placeholder="Email subject line…"
                  className="bg-background text-sm font-medium"
                />
              </div>

              {/* Tab Studio */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between pb-2">
                  <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="preview" className="text-xs font-semibold">
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview
                    </TabsTrigger>
                    <TabsTrigger value="code" className="text-xs font-semibold">
                      <Code className="w-3.5 h-3.5 mr-1.5" /> Edit HTML
                    </TabsTrigger>
                    <TabsTrigger value="info" className="text-xs font-semibold">
                      <Info className="w-3.5 h-3.5 mr-1.5" /> Info
                    </TabsTrigger>
                  </TabsList>

                  {/* Device Toggle */}
                  {activeTab === "preview" && (
                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
                      <button
                        onClick={() => setPreviewDevice("desktop")}
                        className={cn(
                          "p-1.5 rounded-md transition-all",
                          previewDevice === "desktop" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                        )}
                      >
                        <Monitor className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPreviewDevice("mobile")}
                        className={cn(
                          "p-1.5 rounded-md transition-all",
                          previewDevice === "mobile" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                        )}
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {activeTab === "code" && isDirty && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      onClick={() => {
                        setEditedHtml(selectedTemplate.currentBodyHtml);
                        setEditedSubject(selectedTemplate.currentSubject);
                        setIsDirty(false);
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Reset edits
                    </Button>
                  )}
                </div>

                {/* Visual Preview Tab */}
                <TabsContent value="preview" className="mt-1">
                  <div className="flex justify-center bg-slate-900 p-6 rounded-2xl border border-border/80 overflow-hidden min-h-[500px]">
                    <div className={cn(
                      "bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 transition-all duration-300 flex flex-col",
                      previewDevice === "mobile" ? "w-[390px] h-[640px]" : "w-full min-h-[500px]"
                    )}>
                      {/* Fake email chrome */}
                      <div className="flex-shrink-0 bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-start gap-3 text-xs text-slate-500">
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700">From:</span>
                            <span>AutoExports &lt;noreply@autoexports.live&gt;</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700">Subject:</span>
                            <span className="font-medium text-slate-800">{editedSubject}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 mt-0.5">
                          {previewDevice === "mobile" ? "390px" : "Full-width"}
                        </span>
                      </div>
                      {/* Sandboxed iframe */}
                      <iframe
                        key={`${selectedEmailType}-${editedHtml.length}`}
                        srcDoc={editedHtml || "<div style='color:#888;padding:32px;font-family:sans-serif;'>No HTML content available.</div>"}
                        className="w-full flex-1 border-0 bg-white"
                        title={`Preview: ${selectedTemplate.displayName}`}
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* HTML Code Editor Tab */}
                <TabsContent value="code" className="mt-1 space-y-2">
                  <p className="text-xs text-muted-foreground px-1">
                    Edit the HTML template below. Changes only go live after clicking <strong>Save Changes</strong>.
                    {selectedTemplate.isCustomized && (
                      <> The original default HTML is preserved and available via <em>Revert to Default</em>.</>
                    )}
                  </p>
                  <Textarea
                    value={editedHtml}
                    onChange={(e) => { setEditedHtml(e.target.value); setIsDirty(true); }}
                    rows={22}
                    spellCheck={false}
                    className="font-mono text-xs leading-relaxed bg-slate-950 text-emerald-400 border-slate-800 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
                  />
                </TabsContent>

                {/* Info Tab */}
                <TabsContent value="info" className="mt-1">
                  <div className="bg-muted/30 p-5 rounded-xl border border-border/60 space-y-4 text-xs font-mono">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <div>
                        <p className="text-muted-foreground mb-0.5">Email Type Key</p>
                        <p className="font-bold text-foreground">{selectedTemplate.emailType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-0.5">Category</p>
                        <p className="font-bold text-foreground">{selectedTemplate.category}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-0.5">Customised</p>
                        <p className={cn("font-bold", selectedTemplate.isCustomized ? "text-amber-500" : "text-emerald-500")}>
                          {selectedTemplate.isCustomized ? "Yes — admin edits active" : "No — using code default"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-0.5">Last Updated</p>
                        <p className="font-bold text-foreground">
                          {selectedTemplate.lastEditedAt
                            ? new Date(selectedTemplate.lastEditedAt).toLocaleString()
                            : "Never edited"}
                        </p>
                      </div>
                    </div>

                    {/* Sample Data */}
                    <div className="border-t border-border/40 pt-4">
                      <p className="text-muted-foreground mb-2 font-bold not-mono text-xs uppercase tracking-wider">Sample Data (used for preview)</p>
                      <pre className="bg-slate-950 text-cyan-400 p-4 rounded-lg overflow-x-auto text-[11px] leading-relaxed max-h-[200px] overflow-y-auto">
                        {JSON.stringify(JSON.parse(selectedTemplate.sampleDataJson), null, 2)}
                      </pre>
                    </div>

                    <div className="border-t border-border/40 pt-4 not-mono text-xs text-muted-foreground space-y-1.5">
                      <p className="font-semibold text-foreground">ℹ️ How this works</p>
                      <p>When an event triggers this email type, the system checks for a saved customised version. If <strong>Customised</strong> is active, your saved HTML and subject replace the code-generated version before dispatch.</p>
                      <p>Use <strong>Revert to Default</strong> at any time to restore the original code-generated template.</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
