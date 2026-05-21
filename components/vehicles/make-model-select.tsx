"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  CAR_MAKES,
  getModelsForMake,
  isCatalogMake,
  normalizeMake,
  OTHER_MAKE_VALUE,
} from "@/lib/vehicle-catalog";

interface SearchableSelectProps {
  id?: string;
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  value: string;
  options: string[];
  disabled?: boolean;
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
  onChange,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onChange(option);
                      setOpen(false);
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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
  allowOtherMake = false,
  makeLabel = "Make",
  modelLabel = "Model",
  className,
}: MakeModelSelectProps) => {
  const isOtherMake = make === OTHER_MAKE_VALUE;
  const catalogMake = isOtherMake ? "" : normalizeMake(make);
  const hasCatalogMake = isCatalogMake(catalogMake);

  const makeOptions = useMemo(() => {
    const options = [...CAR_MAKES];
    if (allowOtherMake) {
      options.push(OTHER_MAKE_VALUE);
    }
    return options;
  }, [allowOtherMake]);

  const modelOptions = useMemo(() => {
    if (!hasCatalogMake) return [];
    return getModelsForMake(catalogMake);
  }, [catalogMake, hasCatalogMake]);

  const handleMakeChange = (nextMake: string) => {
    onMakeChange(nextMake);
    onModelChange("");
    if (nextMake !== OTHER_MAKE_VALUE) {
      onMakeCustomChange?.("");
    }
  };

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <SearchableSelect
        id="make"
        label={makeLabel}
        placeholder="Select make"
        searchPlaceholder="Search makes..."
        emptyMessage="No make found."
        value={make}
        options={makeOptions}
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
          searchPlaceholder="Search models..."
          emptyMessage="No model found."
          value={model}
          options={modelOptions}
          disabled={!hasCatalogMake}
          onChange={onModelChange}
        />
      )}
    </div>
  );
};
