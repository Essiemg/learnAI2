import { useState, useRef } from "react";
import {
  FolderOpen,
  Plus,
  Upload,
  Trash2,
  Edit2,
  FileText,
  Image,
  MoreVertical,
  Loader2,
  FolderPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudySets } from "@/hooks/useStudySets";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function StudySets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    studySets,
    materials,
    isLoading,
    createStudySet,
    updateStudySet,
    deleteStudySet,
    uploadMaterial,
    moveMaterial,
    deleteMaterial,
    getMaterialsInSet,
  } = useStudySets();

  const [newSetName, setNewSetName] = useState("");
  const [editingSet, setEditingSet] = useState<{ id: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [movingMaterial, setMovingMaterial] = useState<string | null>(null);
  const [moveTargetSet, setMoveTargetSet] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateSet = async () => {
    if (!newSetName.trim()) {
      toast.error("Please enter a name for the study set");
      return;
    }

    const result = await createStudySet(newSetName.trim());
    if (result) {
      toast.success("Study set created");
      setNewSetName("");
    } else {
      toast.error("Failed to create study set");
    }
  };

  const handleUpdateSet = async () => {
    if (!editingSet || !editingSet.name.trim()) return;

    const result = await updateStudySet(editingSet.id, { name: editingSet.name.trim() });
    if (result) {
      toast.success("Study set updated");
      setEditingSet(null);
    } else {
      toast.error("Failed to update study set");
    }
  };

  const handleDeleteSet = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Materials will be moved to Unorganized.`)) return;

    const result = await deleteStudySet(id);
    if (result) {
      toast.success("Study set deleted");
    } else {
      toast.error("Failed to delete study set");
    }
  };

  const handleUploadClick = (studySetId: string | null) => {
    setUploadTarget(studySetId);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }

        const result = await uploadMaterial(file, uploadTarget || undefined);
        if (result) {
          toast.success(`Uploaded ${file.name}`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    } finally {
      setIsUploading(false);
      setUploadTarget(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleMoveMaterial = async () => {
    if (!movingMaterial) return;

    const targetSetId = moveTargetSet === "unorganized" ? null : moveTargetSet;
    const result = await moveMaterial(movingMaterial, targetSetId);
    if (result) {
      toast.success("Material moved");
      setMovingMaterial(null);
      setMoveTargetSet("");
    } else {
      toast.error("Failed to move material");
    }
  };

  const handleDeleteMaterial = async (id: string, filePath: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;

    const result = await deleteMaterial(id, filePath);
    if (result) {
      toast.success("Material deleted");
    } else {
      toast.error("Failed to delete material");
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    return FileText;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign in to Access Study Sets</h2>
            <p className="text-muted-foreground mb-4">
              Organize your study materials into folders for easy access.
            </p>
            <Button onClick={() => navigate("/login")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unorganizedMaterials = getMaterialsInSet(null);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.doc,.docx"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8 text-primary" />
            Study Sets
          </h1>
          <p className="text-muted-foreground">
            Organize your study materials into folders
          </p>
        </div>

        {/* Create new set dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <FolderPlus className="h-4 w-4" />
              New Study Set
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Study Set</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="set-name">Name</Label>
                <Input
                  id="set-name"
                  placeholder="e.g., Math Chapter 5"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handleCreateSet}>Create</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Study Sets */}
          {studySets.map((set) => {
            const setMaterials = getMaterialsInSet(set.id);

            return (
              <Card key={set.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      {set.name}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({setMaterials.length} files)
                      </span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUploadClick(set.id)}
                        disabled={isUploading}
                      >
                        {isUploading && uploadTarget === set.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-1" />
                            Upload
                          </>
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingSet({ id: set.id, name: set.name })}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteSet(set.id, set.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {setMaterials.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No files in this set. Upload some materials to get started.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {setMaterials.map((material) => {
                        const Icon = getFileIcon(material.file_type);
                        return (
                          <div
                            key={material.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted group"
                          >
                            <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {material.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(material.file_size)}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 h-8 w-8"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setMovingMaterial(material.id)}>
                                  <FolderOpen className="h-4 w-4 mr-2" />
                                  Move to...
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteMaterial(material.id, material.file_path, material.file_name)
                                  }
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Unorganized Materials */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Unorganized
                  <span className="text-sm font-normal text-muted-foreground">
                    ({unorganizedMaterials.length} files)
                  </span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUploadClick(null)}
                  disabled={isUploading}
                >
                  {isUploading && uploadTarget === null ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {unorganizedMaterials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No unorganized files.
                </p>
              ) : (
                <div className="grid gap-2">
                  {unorganizedMaterials.map((material) => {
                    const Icon = getFileIcon(material.file_type);
                    return (
                      <div
                        key={material.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted group"
                      >
                        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {material.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(material.file_size)}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setMovingMaterial(material.id)}>
                              <FolderOpen className="h-4 w-4 mr-2" />
                              Move to...
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeleteMaterial(material.id, material.file_path, material.file_name)
                              }
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Empty state */}
          {studySets.length === 0 && unorganizedMaterials.length === 0 && (
            <Card className="p-12 text-center">
              <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Study Materials Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create a study set and upload your learning materials to get started.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Edit Set Dialog */}
      <Dialog open={!!editingSet} onOpenChange={(open) => !open && setEditingSet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Study Set</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editingSet?.name || ""}
                onChange={(e) =>
                  setEditingSet((prev) => (prev ? { ...prev, name: e.target.value } : null))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSet(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSet}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Material Dialog */}
      <Dialog open={!!movingMaterial} onOpenChange={(open) => !open && setMovingMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Study Set</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select destination</Label>
              <Select value={moveTargetSet} onValueChange={setMoveTargetSet}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a study set..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unorganized">Unorganized</SelectItem>
                  {studySets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovingMaterial(null)}>
              Cancel
            </Button>
            <Button onClick={handleMoveMaterial} disabled={!moveTargetSet}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
