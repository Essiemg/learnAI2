import { useState, useEffect } from "react";
import { FileText, FolderOpen, Loader2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useStudySets } from "@/hooks/useStudySets";

interface SelectedMaterial {
  id: string;
  name: string;
  type: string;
  base64: string;
}

interface MaterialSelectorProps {
  onSelect: (materials: SelectedMaterial[]) => void;
  selectedIds: string[];
  maxSelection?: number;
  className?: string;
}

export function MaterialSelector({
  onSelect,
  selectedIds,
  maxSelection = 1,
  className,
}: MaterialSelectorProps) {
  const { studySets, materials, isLoading, getMaterialBase64 } = useStudySets();
  const [expandedSets, setExpandedSets] = useState<string[]>([]);
  const [loadingMaterial, setLoadingMaterial] = useState<string | null>(null);

  const toggleSet = (setId: string) => {
    setExpandedSets((prev) =>
      prev.includes(setId) ? prev.filter((id) => id !== setId) : [...prev, setId]
    );
  };

  const handleSelectMaterial = async (material: {
    id: string;
    file_name: string;
    file_type: string;
  }) => {
    const isSelected = selectedIds.includes(material.id);

    if (isSelected) {
      // Deselect
      onSelect([]);
      return;
    }

    if (maxSelection === 1) {
      // Single selection mode - fetch and select
      setLoadingMaterial(material.id);
      try {
        const fullMaterial = materials.find((m) => m.id === material.id);
        if (fullMaterial) {
          const base64 = await getMaterialBase64(fullMaterial);
          if (base64) {
            onSelect([
              {
                id: material.id,
                name: material.file_name,
                type: material.file_type,
                base64,
              },
            ]);
          }
        }
      } finally {
        setLoadingMaterial(null);
      }
    }
  };

  const getMaterialsForSet = (setId: string | null) => {
    if (setId === null) {
      return materials.filter((m) => !m.study_set_id);
    }
    return materials.filter((m) => m.study_set_id === setId);
  };

  const unorganizedMaterials = getMaterialsForSet(null);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground mb-2">No study materials yet</p>
        <p className="text-xs text-muted-foreground">
          Upload materials in the Study Sets page first
        </p>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium text-muted-foreground">
        Select from your Study Sets
      </p>

      {/* Study Sets */}
      {studySets.map((set) => {
        const setMaterials = getMaterialsForSet(set.id);
        if (setMaterials.length === 0) return null;

        return (
          <Collapsible
            key={set.id}
            open={expandedSets.includes(set.id)}
            onOpenChange={() => toggleSet(set.id)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {set.name}
                  <span className="text-xs text-muted-foreground">
                    ({setMaterials.length})
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedSets.includes(set.id) && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-1 pl-4">
                {setMaterials.map((material) => (
                  <MaterialItem
                    key={material.id}
                    material={material}
                    isSelected={selectedIds.includes(material.id)}
                    isLoading={loadingMaterial === material.id}
                    onClick={() => handleSelectMaterial(material)}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Unorganized materials */}
      {unorganizedMaterials.length > 0 && (
        <Collapsible
          open={expandedSets.includes("unorganized")}
          onOpenChange={() => toggleSet("unorganized")}
        >
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Unorganized
                <span className="text-xs text-muted-foreground">
                  ({unorganizedMaterials.length})
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expandedSets.includes("unorganized") && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-1 pl-4">
              {unorganizedMaterials.map((material) => (
                <MaterialItem
                  key={material.id}
                  material={material}
                  isSelected={selectedIds.includes(material.id)}
                  isLoading={loadingMaterial === material.id}
                  onClick={() => handleSelectMaterial(material)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function MaterialItem({
  material,
  isSelected,
  isLoading,
  onClick,
}: {
  material: { id: string; file_name: string; file_type: string };
  isSelected: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "w-full flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-colors",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-transparent hover:bg-muted"
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : isSelected ? (
        <Check className="h-4 w-4 text-primary shrink-0" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <span className="truncate">{material.file_name}</span>
    </button>
  );
}
