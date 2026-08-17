"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  Car,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  GitMerge,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  X,
  Filter,
  Loader2,
  Shield,
  User,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  checkDuplicateMake,
  checkDuplicateModel,
  formatCanonicalName,
} from "@/lib/vehicle-dedup";

interface VehicleCatalogManagerProps {
  token: string;
}

export function VehicleCatalogManager({ token }: VehicleCatalogManagerProps) {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedMakeForModels, setSelectedMakeForModels] = useState<any | null>(null);

  // Queries & Mutations
  const catalogEntries = useQuery(
    (api as any).vehicleCatalog.getAdminCatalog,
    token
      ? {
          token,
          search: searchTerm || undefined,
          statusFilter: statusFilter !== "all" ? statusFilter : undefined,
          creatorRoleFilter: roleFilter !== "all" ? roleFilter : undefined,
        }
      : "skip"
  ) as any[] | undefined;

  const addMakeMutation = useMutation((api as any).vehicleCatalog.addMake);
  const addModelMutation = useMutation((api as any).vehicleCatalog.addModel);
  const updateMakeMutation = useMutation((api as any).vehicleCatalog.adminUpdateMake);
  const deleteMakeMutation = useMutation((api as any).vehicleCatalog.adminDeleteMake);
  const deleteModelMutation = useMutation((api as any).vehicleCatalog.adminDeleteModel);
  const mergeMakesMutation = useMutation((api as any).vehicleCatalog.adminMergeMakes);
  const bootstrapMutation = useMutation((api as any).vehicleCatalog.bootstrapCatalog);

  // Modal States
  const [addMakeOpen, setAddMakeOpen] = useState(false);
  const [newMakeName, setNewMakeName] = useState("");
  const [newMakeModels, setNewMakeModels] = useState("");
  const [isSubmittingMake, setIsSubmittingMake] = useState(false);

  const [addModelOpen, setAddModelOpen] = useState(false);
  const [targetMakeForModel, setTargetMakeForModel] = useState<any | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [isSubmittingModel, setIsSubmittingModel] = useState(false);

  const [editMakeOpen, setEditMakeOpen] = useState(false);
  const [editingMake, setEditingMake] = useState<any | null>(null);
  const [editMakeName, setEditMakeName] = useState("");
  const [editAliases, setEditAliases] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "pending_review" | "archived">("active");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [mergeOpen, setMergeOpen] = useState(false);
  const [sourceMakeId, setSourceMakeId] = useState<string>("");
  const [targetMakeId, setTargetMakeId] = useState<string>("");
  const [isSubmittingMerge, setIsSubmittingMerge] = useState(false);

  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // Computed Stats
  const stats = useMemo(() => {
    if (!catalogEntries) return { totalMakes: 0, totalModels: 0, buyerCreated: 0, activeMakes: 0 };
    const totalMakes = catalogEntries.length;
    let totalModels = 0;
    let buyerCreated = 0;
    let activeMakes = 0;

    for (const e of catalogEntries) {
      totalModels += e.models.length;
      if (e.creatorRole === "buyer" || e.creatorRole === "seller") buyerCreated++;
      if (e.status !== "archived") activeMakes++;
    }

    return { totalMakes, totalModels, buyerCreated, activeMakes };
  }, [catalogEntries]);

  // Live duplicate checks
  const makeDuplicateCheck = useMemo(() => {
    if (!newMakeName.trim() || !catalogEntries) return null;
    const existingList = catalogEntries.map((e: any) => ({
      make: e.make,
      aliases: e.aliases,
      models: e.models,
    }));
    return checkDuplicateMake(newMakeName, existingList);
  }, [newMakeName, catalogEntries]);

  const modelDuplicateCheck = useMemo(() => {
    if (!newModelName.trim() || !targetMakeForModel) return null;
    return checkDuplicateModel(newModelName, targetMakeForModel.models || []);
  }, [newModelName, targetMakeForModel]);

  // Handlers
  const handleCreateMake = async () => {
    if (!newMakeName.trim()) return;
    setIsSubmittingMake(true);
    try {
      const models = newMakeModels
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      await addMakeMutation({
        token,
        make: newMakeName.trim(),
        initialModels: models,
        allowSimilar: true,
      });

      toast({
        title: "Manufacturer added",
        description: `Successfully added "${formatCanonicalName(newMakeName.trim())}".`,
      });

      setAddMakeOpen(false);
      setNewMakeName("");
      setNewMakeModels("");
    } catch (err: any) {
      toast({
        title: "Failed to add manufacturer",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingMake(false);
    }
  };

  const handleCreateModel = async () => {
    if (!newModelName.trim() || !targetMakeForModel) return;
    setIsSubmittingModel(true);
    try {
      await addModelMutation({
        token,
        make: targetMakeForModel.make,
        model: newModelName.trim(),
        allowSimilar: true,
      });

      toast({
        title: "Model added",
        description: `Successfully added "${formatCanonicalName(newModelName.trim())}" to ${targetMakeForModel.make}.`,
      });

      setAddModelOpen(false);
      setNewModelName("");
      setTargetMakeForModel(null);
    } catch (err: any) {
      toast({
        title: "Failed to add model",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingModel(false);
    }
  };

  const handleSaveEditMake = async () => {
    if (!editingMake || !editMakeName.trim()) return;
    setIsSubmittingEdit(true);
    try {
      const aliases = editAliases
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      await updateMakeMutation({
        token,
        id: editingMake._id,
        make: editMakeName.trim(),
        aliases,
        status: editStatus,
      });

      toast({
        title: "Manufacturer updated",
        description: `Updated "${editMakeName.trim()}".`,
      });

      setEditMakeOpen(false);
      setEditingMake(null);
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteMake = async (makeEntry: any) => {
    if (!confirm(`Are you sure you want to archive manufacturer "${makeEntry.make}"?`)) {
      return;
    }
    try {
      await deleteMakeMutation({
        token,
        id: makeEntry._id,
        permanent: false,
      });
      toast({
        title: "Manufacturer archived",
        description: `"${makeEntry.make}" has been archived.`,
      });
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteModel = async (makeId: Id<"vehicleCatalog">, modelName: string) => {
    if (!confirm(`Remove model "${modelName}" from catalog?`)) return;
    try {
      await deleteModelModelMutationWrapper(makeId, modelName);
      toast({
        title: "Model removed",
        description: `Removed "${modelName}".`,
      });
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const deleteModelModelMutationWrapper = async (makeId: Id<"vehicleCatalog">, modelName: string) => {
    await deleteModelMutation({
      token,
      id: makeId,
      model: modelName,
    });
  };

  const handleMergeMakes = async () => {
    if (!sourceMakeId || !targetMakeId) return;
    setIsSubmittingMerge(true);
    try {
      const res = await mergeMakesMutation({
        token,
        sourceId: sourceMakeId as Id<"vehicleCatalog">,
        targetId: targetMakeId as Id<"vehicleCatalog">,
      });

      toast({
        title: "Makes merged",
        description: `Consolidated into "${res.targetMake}" with ${res.mergedModelsCount} models.`,
      });

      setMergeOpen(false);
      setSourceMakeId("");
      setTargetMakeId("");
    } catch (err: any) {
      toast({
        title: "Merge failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingMerge(false);
    }
  };

  const handleBootstrapSync = async () => {
    setIsBootstrapping(true);
    try {
      const res = await bootstrapMutation({ token });
      toast({
        title: "Catalog Synced",
        description: `Imported ${res.insertedCount} new makes and updated ${res.updatedCount} makes. Total: ${res.totalCatalogMakes}`,
      });
    } catch (err: any) {
      toast({
        title: "Sync failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsBootstrapping(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "buyer":
        return (
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px] bg-emerald-500/5">
            <User className="h-3 w-3 mr-1" /> Buyer
          </Badge>
        );
      case "seller":
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px] bg-amber-500/5">
            <ShoppingBag className="h-3 w-3 mr-1" /> Vendor
          </Badge>
        );
      case "admin":
      case "superadmin":
        return (
          <Badge variant="outline" className="text-electric-blue border-electric-blue/30 text-[10px] bg-electric-blue/5">
            <Shield className="h-3 w-3 mr-1" /> Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">
            System
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stat Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Car className="h-6 w-6 text-electric-blue" />
            Vehicle Catalog & Models
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage car makes and models in the database, prevent duplicates with fuzzy matching, and review user-added entries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBootstrapSync}
            disabled={isBootstrapping}
            className="text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isBootstrapping && "animate-spin")} />
            Sync Defaults
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMergeOpen(true)}
            className="text-xs"
          >
            <GitMerge className="h-3.5 w-3.5 mr-1.5" />
            Merge Duplicates
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setNewMakeName("");
              setNewMakeModels("");
              setAddMakeOpen(true);
            }}
            className="bg-electric-blue hover:bg-electric-blue/90 text-white text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Manufacturer
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-medium text-muted-foreground">Total Makes</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.totalMakes}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-medium text-muted-foreground">Total Models</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.totalModels}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-medium text-muted-foreground">User / Buyer Added</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{stats.buyerCreated}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-medium text-muted-foreground">Active Catalog</p>
          <p className="text-2xl font-bold text-electric-blue mt-1">{stats.activeMakes}</p>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 bg-card border-border">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search manufacturers, models, or aliases..."
              className="pl-9 bg-background"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-36">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_review">Pending</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Creator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="system">System Seed</SelectItem>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Vendor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Catalog Table */}
      <Card className="border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Models ({stats.totalModels})</TableHead>
              <TableHead className="w-28">Source</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="text-right w-36">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalogEntries === undefined ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-electric-blue" />
                  Loading vehicle catalog...
                </TableCell>
              </TableRow>
            ) : catalogEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No vehicle makes found. Try clearing your search or clicking &quot;Sync Defaults&quot;.
                </TableCell>
              </TableRow>
            ) : (
              catalogEntries.map((item) => (
                <TableRow key={item._id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold text-foreground align-top">
                    <div>{item.make}</div>
                    {item.aliases && item.aliases.length > 0 && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Aliases: {item.aliases.join(", ")}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="flex flex-wrap gap-1.5 max-w-2xl">
                      {item.models.slice(0, 10).map((m: string) => (
                        <Badge
                          key={m}
                          variant="secondary"
                          className="text-[11px] py-0.5 px-2 bg-accent/50 group flex items-center gap-1"
                        >
                          <span>{m}</span>
                          <button
                            onClick={() => handleDeleteModel(item._id, m)}
                            className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                            title="Remove model"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                      {item.models.length > 10 && (
                        <Badge
                          variant="outline"
                          className="text-[11px] cursor-pointer hover:bg-accent"
                          onClick={() => setSelectedMakeForModels(item)}
                        >
                          +{item.models.length - 10} more...
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] text-electric-blue hover:bg-electric-blue/10"
                        onClick={() => {
                          setTargetMakeForModel(item);
                          setNewModelName("");
                          setAddModelOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-0.5" /> Add
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    {getRoleBadge(item.creatorRole)}
                  </TableCell>

                  <TableCell className="align-top">
                    <Badge
                      variant={item.status === "archived" ? "destructive" : "outline"}
                      className={cn(
                        "text-[10px] capitalize",
                        item.status === "active" && "border-emerald-500/30 text-emerald-500 bg-emerald-500/5",
                        item.status === "pending_review" && "border-warning-amber/30 text-warning-amber bg-warning-amber/5"
                      )}
                    >
                      {item.status || "active"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right align-top space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setEditingMake(item);
                        setEditMakeName(item.make);
                        setEditAliases((item.aliases || []).join(", "));
                        setEditStatus(item.status || "active");
                        setEditMakeOpen(true);
                      }}
                      title="Edit Make"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteMake(item)}
                      title="Archive Make"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal: View All Models for a Make */}
      <Dialog open={Boolean(selectedMakeForModels)} onOpenChange={() => setSelectedMakeForModels(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMakeForModels?.make} Models ({selectedMakeForModels?.models?.length})</DialogTitle>
            <DialogDescription>Full list of registered models for this manufacturer.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 py-4 max-h-80 overflow-y-auto">
            {selectedMakeForModels?.models?.map((m: string) => (
              <Badge
                key={m}
                variant="secondary"
                className="text-xs py-1 px-2.5 flex items-center gap-1.5 group"
              >
                <span>{m}</span>
                <button
                  onClick={() => {
                    handleDeleteModel(selectedMakeForModels._id, m);
                    setSelectedMakeForModels((prev: any) => ({
                      ...prev,
                      models: prev.models.filter((item: string) => item !== m),
                    }));
                  }}
                  className="hover:text-destructive"
                  title="Remove model"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMakeForModels(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Manufacturer */}
      <Dialog open={addMakeOpen} onOpenChange={setAddMakeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-electric-blue" />
              Add New Manufacturer
            </DialogTitle>
            <DialogDescription>
              Create a new vehicle make with strict duplicate prevention and pattern matching.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {makeDuplicateCheck?.isDuplicate && (
              <Alert className="border-warning-amber/40 bg-warning-amber/10">
                <AlertTriangle className="h-4 w-4 text-warning-amber" />
                <AlertDescription className="text-xs">
                  {makeDuplicateCheck.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="make-name">Manufacturer Name</Label>
              <Input
                id="make-name"
                value={newMakeName}
                onChange={(e) => setNewMakeName(e.target.value)}
                placeholder="e.g. Lucid, Rivian, Zeekr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="make-models">Initial Models (Comma separated)</Label>
              <Input
                id="make-models"
                value={newMakeModels}
                onChange={(e) => setNewMakeModels(e.target.value)}
                placeholder="e.g. Air, Gravity, Touring"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMakeOpen(false)} disabled={isSubmittingMake}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateMake}
              disabled={!newMakeName.trim() || isSubmittingMake}
              className="bg-electric-blue hover:bg-electric-blue/90 text-white"
            >
              {isSubmittingMake ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {makeDuplicateCheck?.isDuplicate ? "Create Anyway" : "Add Manufacturer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Model */}
      <Dialog open={addModelOpen} onOpenChange={setAddModelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Model to {targetMakeForModel?.make}</DialogTitle>
            <DialogDescription>
              Add a new model to this manufacturer&apos;s catalog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {modelDuplicateCheck?.isDuplicate && (
              <Alert className="border-warning-amber/40 bg-warning-amber/10">
                <AlertTriangle className="h-4 w-4 text-warning-amber" />
                <AlertDescription className="text-xs">
                  {modelDuplicateCheck.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="e.g. Model 3, Seal, Taycan 4S"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModelOpen(false)} disabled={isSubmittingModel}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateModel}
              disabled={!newModelName.trim() || isSubmittingModel}
              className="bg-electric-blue hover:bg-electric-blue/90 text-white"
            >
              {isSubmittingModel ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {modelDuplicateCheck?.isDuplicate ? "Create Anyway" : "Add Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Make */}
      <Dialog open={editMakeOpen} onOpenChange={setEditMakeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Manufacturer</DialogTitle>
            <DialogDescription>
              Update display name, aliases, or catalog status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-make-name">Display Name</Label>
              <Input
                id="edit-make-name"
                value={editMakeName}
                onChange={(e) => setEditMakeName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-aliases">Aliases (Comma separated)</Label>
              <Input
                id="edit-aliases"
                value={editAliases}
                onChange={(e) => setEditAliases(e.target.value)}
                placeholder="e.g. Merc, Mercedes, Benz"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMakeOpen(false)} disabled={isSubmittingEdit}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditMake}
              disabled={!editMakeName.trim() || isSubmittingEdit}
              className="bg-electric-blue hover:bg-electric-blue/90 text-white"
            >
              {isSubmittingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Merge Makes */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-electric-blue" />
              Merge Duplicate Manufacturers
            </DialogTitle>
            <DialogDescription>
              Consolidate two makes by transferring all models and aliases to the target make, and archiving the source make.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Source Make (Will be merged and archived)</Label>
              <Select value={sourceMakeId} onValueChange={setSourceMakeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duplicate make to merge..." />
                </SelectTrigger>
                <SelectContent>
                  {catalogEntries?.map((e: any) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.make} ({e.models.length} models)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Make (Will retain all combined models)</Label>
              <Select value={targetMakeId} onValueChange={setTargetMakeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select canonical destination make..." />
                </SelectTrigger>
                <SelectContent>
                  {catalogEntries
                    ?.filter((e: any) => e._id !== sourceMakeId)
                    .map((e: any) => (
                      <SelectItem key={e._id} value={e._id}>
                        {e.make} ({e.models.length} models)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)} disabled={isSubmittingMerge}>
              Cancel
            </Button>
            <Button
              onClick={handleMergeMakes}
              disabled={!sourceMakeId || !targetMakeId || isSubmittingMerge}
              className="bg-electric-blue hover:bg-electric-blue/90 text-white"
            >
              {isSubmittingMerge ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
