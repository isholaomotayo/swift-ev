"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Check, ChevronsUpDown, Plus, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  CAR_MAKES,
  getModelsForMake,
  isCatalogMake,
  normalizeMake,
  OTHER_MAKE_VALUE,
  mergeCatalog,
} from "@/lib/vehicle-catalog";
import {
  checkDuplicateMake,
  checkDuplicateModel,
  formatCanonicalName,
  toNormalizedKey,
} from "@/lib/vehicle-dedup";

interface SearchableSelectProps {
  id?: string;
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  value: string;
  options: string[];
  disabled?: boolean;
  allowCreation?: boolean;
  creationTypeLabel?: string;
  helperText?: string;
  onAddNew?: (val: string) => void;
  onChange: (value: string) => void;
}

const SearchableSelect = ({
  id,
  label,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  value,
  options,
  disabled = false,
  allowCreation = true,
  creationTypeLabel = "item",
  helperText,
  onAddNew,
  onChange,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const trimmedSearch = searchValue.trim();
  const exactMatchExists = useMemo(() => {
    if (!trimmedSearch) return true;
    const normSearch = toNormalizedKey(trimmedSearch);
    return options.some((opt) => toNormalizedKey(opt) === normSearch);
  }, [trimmedSearch, options]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-semibold">{label}</Label>
        {allowCreation && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAddNew?.(trimmedSearch)}
            className="text-[11px] text-electric-blue hover:underline inline-flex items-center font-medium disabled:opacity-50 disabled:pointer-events-none"
          >
            <Plus className="h-3 w-3 mr-0.5" />
            Add new {creationTypeLabel}
          </button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal bg-card hover:bg-accent/50 transition-colors"
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
            />

            <CommandList className="max-h-60">
              <CommandEmpty>
                <div className="py-3 px-2 text-center text-sm space-y-2">
                  <p className="text-muted-foreground text-xs">{emptyMessage}</p>
                  {allowCreation && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs font-medium bg-electric-blue/10 text-electric-blue hover:bg-electric-blue/20"
                      onClick={() => {
                        onAddNew?.(trimmedSearch);
                        setOpen(false);
                        setSearchValue("");
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add &quot;{trimmedSearch || "new"}&quot; as new {creationTypeLabel}
                    </Button>
                  )}
                </div>
              </CommandEmpty>

              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onChange(option);
                      setOpen(false);
                      setSearchValue("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>

              {allowCreation && trimmedSearch && !exactMatchExists && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      value={`__create_${trimmedSearch}`}
                      onSelect={() => {
                        onAddNew?.(trimmedSearch);
                        setOpen(false);
                        setSearchValue("");
                      }}
                      className="text-electric-blue font-medium cursor-pointer"
                    >
                      <Plus className="mr-2 h-4 w-4 text-electric-blue" />
                      Add &quot;{trimmedSearch}&quot; as new {creationTypeLabel}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>

            {/* Persistent bottom action visible even when scrolling all options */}
            {allowCreation && (
              <div className="p-2 border-t border-border bg-muted/40 backdrop-blur-sm">
                <div className="px-1 mb-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    Can&apos;t find your {creationTypeLabel}?
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium border-dashed border-electric-blue/40 text-electric-blue hover:bg-electric-blue/10 justify-center h-8"
                  onClick={() => {
                    onAddNew?.(trimmedSearch);
                    setOpen(false);
                    setSearchValue("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {trimmedSearch
                    ? `Add "${trimmedSearch}" as new ${creationTypeLabel}`
                    : `+ Add new ${creationTypeLabel}`}
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {helperText && (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
};

export interface MakeModelSelectProps {
  make: string;
  model: string;
  makeCustom?: string;
  onMakeChange: (make: string) => void;
  onModelChange: (model: string) => void;
  onMakeCustomChange?: (makeCustom: string) => void;
  onCatalogEntryAdded?: (entry: { make: string; model: string }) => void;
  allowOtherMake?: boolean;
  makeLabel?: string;
  modelLabel?: string;
  className?: string;
}

export const MakeModelSelect = ({
  make,
  model,
  makeCustom = "",
  onMakeChange,
  onModelChange,
  onMakeCustomChange,
  onCatalogEntryAdded,
  allowOtherMake = false,
  makeLabel = "Make / Manufacturer",
  modelLabel = "Model",
  className,
}: MakeModelSelectProps) => {
  const { toast } = useToast();
  const { token } = useAuth();

  // Real-time catalog from Convex
  const catalogEntries = useQuery((api as any).vehicleCatalog.getCatalog, {}) as any[] | undefined;
  const addMakeMutation = useMutation((api as any).vehicleCatalog.addMake);
  const addModelMutation = useMutation((api as any).vehicleCatalog.addModel);

  // Dynamic catalog combined with static fallback
  const merged = useMemo(() => {
    return mergeCatalog(catalogEntries);
  }, [catalogEntries]);

  // Dialog states for creating new make / model
  const [createMakeDialogOpen, setCreateMakeDialogOpen] = useState(false);
  const [candidateMake, setCandidateMake] = useState("");
  const [initialModel, setInitialModel] = useState("");
  const [isSubmittingMake, setIsSubmittingMake] = useState(false);
  const [makeDuplicateWarning, setMakeDuplicateWarning] = useState<{
    matchedItem?: string;
    message?: string;
  } | null>(null);

  const [createModelDialogOpen, setCreateModelDialogOpen] = useState(false);
  const [candidateModel, setCandidateModel] = useState("");
  const [isSubmittingModel, setIsSubmittingModel] = useState(false);
  const [modelDuplicateWarning, setModelDuplicateWarning] = useState<{
    matchedItem?: string;
    message?: string;
  } | null>(null);

  const isOtherMake = make === OTHER_MAKE_VALUE;
  const catalogMake = isOtherMake ? "" : normalizeMake(make);
  const hasCatalogMake = isOtherMake ? false : merged.isMake(catalogMake) || isCatalogMake(catalogMake);

  const makeOptions = useMemo(() => {
    const options = [...merged.makes];
    if (allowOtherMake && !options.includes(OTHER_MAKE_VALUE)) {
      options.push(OTHER_MAKE_VALUE);
    }
    return options;
  }, [merged.makes, allowOtherMake]);

  const modelOptions = useMemo(() => {
    if (!hasCatalogMake) return [];
    return merged.getModels(catalogMake);
  }, [catalogMake, hasCatalogMake, merged]);

  const handleMakeChange = (nextMake: string) => {
    onMakeChange(nextMake);
    onModelChange("");
    if (nextMake !== OTHER_MAKE_VALUE) {
      onMakeCustomChange?.("");
    }
  };

  // Triggered when user selects "+ Add [input]" for Make
  const handleInitiateAddMake = (input: string) => {
    const canonical = input.trim() ? formatCanonicalName(input) : "";
    setCandidateMake(canonical);
    setInitialModel("");

    if (canonical) {
      // Check duplicate/similarity pattern
      const catalogMakesList = makeOptions.map((m) => ({ make: m }));
      const check = checkDuplicateMake(canonical, catalogMakesList);

      if (check.isDuplicate) {
        if (check.matchType === "exact" || check.matchType === "case_insensitive" || check.matchType === "normalized") {
          // Direct canonical match exists, select it!
          const existing = check.matchedItem || canonical;
          handleMakeChange(existing);
          toast({
            title: "Make selected",
            description: `Selected existing make "${existing}".`,
          });
          return;
        }
        setMakeDuplicateWarning({
          matchedItem: check.matchedItem,
          message: check.message,
        });
      } else {
        setMakeDuplicateWarning(null);
      }
    } else {
      setMakeDuplicateWarning(null);
    }

    setCreateMakeDialogOpen(true);
  };

  // Confirm saving new Make to database
  const handleConfirmAddMake = async (forceAllow = false) => {
    if (!candidateMake.trim()) return;

    setIsSubmittingMake(true);
    try {
      const res = await addMakeMutation({
        token: token || undefined,
        make: candidateMake.trim(),
        initialModels: initialModel.trim() ? [initialModel.trim()] : [],
        allowSimilar: forceAllow,
      });

      toast({
        title: "Manufacturer added successfully",
        description: `Added "${res.make}" to the vehicle catalog.`,
      });

      handleMakeChange(res.make);
      if (initialModel.trim()) {
        const canonicalInitialModel = formatCanonicalName(initialModel.trim());
        onModelChange(canonicalInitialModel);
        onCatalogEntryAdded?.({ make: res.make, model: canonicalInitialModel });
      }
      for (const modelName of res.models ?? []) {
        onCatalogEntryAdded?.({ make: res.make, model: modelName });
      }
      setCreateMakeDialogOpen(false);
      setCandidateMake("");
      setInitialModel("");
      setMakeDuplicateWarning(null);
    } catch (err: any) {
      toast({
        title: "Could not add make",
        description: err.message || "Failed to add make.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingMake(false);
    }
  };

  // Triggered when user selects "+ Add [input]" for Model
  const handleInitiateAddModel = (input: string) => {
    if (!make || isOtherMake) {
      toast({
        title: "Select a make first",
        description: "Please select a manufacturer before adding a new model.",
        variant: "destructive",
      });
      return;
    }

    const canonical = input.trim() ? formatCanonicalName(input) : "";
    setCandidateModel(canonical);

    if (canonical) {
      // Check duplicate/similarity pattern
      const currentModels = merged.getModels(catalogMake);
      const check = checkDuplicateModel(canonical, currentModels);

      if (check.isDuplicate) {
        if (check.matchType === "exact" || check.matchType === "case_insensitive" || check.matchType === "normalized") {
          const existing = check.matchedItem || canonical;
          onModelChange(existing);
          toast({
            title: "Model selected",
            description: `Selected existing model "${existing}".`,
          });
          return;
        }
        setModelDuplicateWarning({
          matchedItem: check.matchedItem,
          message: check.message,
        });
      } else {
        setModelDuplicateWarning(null);
      }
    } else {
      setModelDuplicateWarning(null);
    }

    setCreateModelDialogOpen(true);
  };

  // Confirm saving new Model to database
  const handleConfirmAddModel = async (forceAllow = false) => {
    if (!candidateModel.trim() || !catalogMake) return;

    setIsSubmittingModel(true);
    try {
      const res = await addModelMutation({
        token: token || undefined,
        make: catalogMake,
        model: candidateModel.trim(),
        allowSimilar: forceAllow,
      });

      toast({
        title: "Model added successfully",
        description: `Added "${res.model}" under ${catalogMake}.`,
      });

      onModelChange(res.model);
      onCatalogEntryAdded?.({ make: catalogMake, model: res.model });
      setCreateModelDialogOpen(false);
      setCandidateModel("");
      setModelDuplicateWarning(null);
    } catch (err: any) {
      toast({
        title: "Could not add model",
        description: err.message || "Failed to add model.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingModel(false);
    }
  };

  return (
    <>
      <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
        <SearchableSelect
          id="make"
          label={makeLabel}
          placeholder="Select make"
          searchPlaceholder="Search or type to add make..."
          emptyMessage="No matching manufacturer found."
          value={make}
          options={makeOptions}
          creationTypeLabel="make"
          allowCreation={true}
          helperText="Select an existing manufacturer or add a new one if not listed."
          onAddNew={handleInitiateAddMake}
          onChange={handleMakeChange}
        />

        {isOtherMake && allowOtherMake ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="makeCustom">Custom make</Label>
              <Input
                id="makeCustom"
                value={makeCustom}
                onChange={(e) => onMakeCustomChange?.(e.target.value)}
                placeholder="Enter manufacturer name"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                placeholder="Enter model name"
              />
            </div>
          </>
        ) : (
          <SearchableSelect
            id="model"
            label={modelLabel}
            placeholder={hasCatalogMake ? "Select model" : "Select make first"}
            searchPlaceholder="Search or type to add model..."
            emptyMessage={hasCatalogMake ? "No matching model found." : "Select a make first to see models."}
            value={model}
            options={modelOptions}
            disabled={!hasCatalogMake}
            creationTypeLabel="model"
            allowCreation={hasCatalogMake}
            helperText={hasCatalogMake ? `Select or add a new model under ${catalogMake}.` : "Choose a manufacturer first."}
            onAddNew={handleInitiateAddModel}
            onChange={onModelChange}
          />
        )}
      </div>

      {/* Dialog for Adding New Make */}
      <Dialog open={createMakeDialogOpen} onOpenChange={setCreateMakeDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-electric-blue" />
              Add New Manufacturer
            </DialogTitle>
            <DialogDescription>
              Can&apos;t find your car manufacturer? Add it here to save it to the platform catalog so everyone can select it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {makeDuplicateWarning && (
              <Alert className="border-warning-amber/40 bg-warning-amber/10 text-foreground">
                <AlertTriangle className="h-4 w-4 text-warning-amber" />
                <AlertDescription className="text-xs space-y-2">
                  <p>{makeDuplicateWarning.message}</p>
                  {makeDuplicateWarning.matchedItem && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 h-7 text-xs border-warning-amber/40 hover:bg-warning-amber/20"
                      onClick={() => {
                        handleMakeChange(makeDuplicateWarning.matchedItem!);
                        setCreateMakeDialogOpen(false);
                      }}
                    >
                      Use existing &quot;{makeDuplicateWarning.matchedItem}&quot;
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-make-input">Manufacturer / Make Name</Label>
              <Input
                id="new-make-input"
                value={candidateMake}
                onChange={(e) => setCandidateMake(e.target.value)}
                placeholder="e.g. Lucid, Rivian, Zeekr, Xiaomi"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="initial-model-input">Initial Model (Optional)</Label>
              <Input
                id="initial-model-input"
                value={initialModel}
                onChange={(e) => setInitialModel(e.target.value)}
                placeholder="e.g. Air, R1T, 001, SU7"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCreateMakeDialogOpen(false)}
              disabled={isSubmittingMake}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleConfirmAddMake(Boolean(makeDuplicateWarning))}
              disabled={!candidateMake.trim() || isSubmittingMake}
              className="bg-electric-blue hover:bg-electric-blue/90 text-white"
            >
              {isSubmittingMake ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : makeDuplicateWarning ? (
                "Create Anyway"
              ) : (
                "Save & Select Make"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Adding New Model */}
      <Dialog open={createModelDialogOpen} onOpenChange={setCreateModelDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-electric-blue" />
              Add New Model for {catalogMake}
            </DialogTitle>
            <DialogDescription>
              Can&apos;t find this model? Add it under {catalogMake} so you and other users can immediately select it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {modelDuplicateWarning && (
              <Alert className="border-warning-amber/40 bg-warning-amber/10 text-foreground">
                <AlertTriangle className="h-4 w-4 text-warning-amber" />
                <AlertDescription className="text-xs space-y-2">
                  <p>{modelDuplicateWarning.message}</p>
                  {modelDuplicateWarning.matchedItem && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 h-7 text-xs border-warning-amber/40 hover:bg-warning-amber/20"
                      onClick={() => {
                        onModelChange(modelDuplicateWarning.matchedItem!);
                        setCreateModelDialogOpen(false);
                      }}
                    >
                      Use existing &quot;{modelDuplicateWarning.matchedItem}&quot;
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-model-input">Model Name</Label>
              <Input
                id="new-model-input"
                value={candidateModel}
                onChange={(e) => setCandidateModel(e.target.value)}
                placeholder="e.g. Model 3, Taycan 4S, Seal, EV6"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCreateModelDialogOpen(false)}
              disabled={isSubmittingModel}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleConfirmAddModel(Boolean(modelDuplicateWarning))}
              disabled={!candidateModel.trim() || isSubmittingModel}
              className="bg-electric-blue hover:bg-electric-blue/90 text-white"
            >
              {isSubmittingModel ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : modelDuplicateWarning ? (
                "Create Anyway"
              ) : (
                "Save & Select Model"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
