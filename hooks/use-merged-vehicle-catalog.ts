"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  appendCatalogPatch,
  isValidVehicleMakeModel,
  mergeCatalog,
  type DynamicCatalogEntry,
} from "@/lib/vehicle-catalog";
import { sanitizeVehicleFormDataForSubmit, type VehicleFormData } from "@/lib/vehicle-form-payload";

type CatalogQueryEntry = {
  make: string;
  models: string[];
};

export function useMergedVehicleCatalog() {
  const catalogEntries = useQuery((api as any).vehicleCatalog.getCatalog, {}) as
    | CatalogQueryEntry[]
    | undefined;
  const [catalogPatches, setCatalogPatches] = useState<DynamicCatalogEntry[]>([]);

  const remoteCatalogEntries = useMemo(
    () =>
      catalogEntries?.map((entry) => ({
        make: entry.make,
        models: entry.models,
      })),
    [catalogEntries]
  );

  const validationCatalogEntries = useMemo(() => {
    if (remoteCatalogEntries === undefined) {
      return undefined;
    }

    return catalogPatches.reduce<DynamicCatalogEntry[]>(
      (entries, patch) => appendCatalogPatch(entries, patch),
      remoteCatalogEntries
    );
  }, [catalogPatches, remoteCatalogEntries]);

  const mergedCatalog = useMemo(
    () => mergeCatalog(validationCatalogEntries),
    [validationCatalogEntries]
  );

  const registerCatalogEntry = useCallback((patch: { make: string; model: string }) => {
    setCatalogPatches((prev) => {
      const nextEntries = appendCatalogPatch(remoteCatalogEntries, patch);
      const normalizedMake = patch.make.trim().toLowerCase();
      const normalizedModel = patch.model.trim().toLowerCase();
      const alreadyTracked = prev.some(
        (entry) =>
          entry.make.trim().toLowerCase() === normalizedMake &&
          entry.models.some((model) => model.trim().toLowerCase() === normalizedModel)
      );
      if (alreadyTracked) {
        return prev;
      }
      return appendCatalogPatch(prev, patch);
    });
  }, [remoteCatalogEntries]);

  const validateResolvedMakeModel = useCallback(
    (make: string, model: string): boolean => {
      const trimmedMake = make.trim();
      const trimmedModel = model.trim();
      if (!trimmedMake || !trimmedModel) {
        return false;
      }

      if (validationCatalogEntries === undefined) {
        return true;
      }

      return isValidVehicleMakeModel(trimmedMake, trimmedModel, {
        allowOtherMake: true,
        dynamicEntries: validationCatalogEntries,
      });
    },
    [validationCatalogEntries]
  );

  const validateVehicleFormMakeModel = useCallback(
    (formData: VehicleFormData): boolean => {
      const resolved = sanitizeVehicleFormDataForSubmit(formData);
      return validateResolvedMakeModel(resolved.make, resolved.model);
    },
    [validateResolvedMakeModel]
  );

  return {
    catalogEntries,
    catalogReady: catalogEntries !== undefined,
    mergedCatalog,
    remoteCatalogEntries,
    validationCatalogEntries,
    registerCatalogEntry,
    validateResolvedMakeModel,
    validateVehicleFormMakeModel,
  };
}
