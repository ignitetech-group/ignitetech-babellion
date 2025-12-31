import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, Globe, Pencil, Trash2, EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Type for items that can be displayed in the grid
export interface ThumbnailGridItem {
  id: string;
  title: string;
  isPrivate: boolean;
  userId: string;
  updatedAt: string | Date | null;
  owner?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

interface ThumbnailItemProps {
  item: ThumbnailGridItem;
  thumbnailEndpoint: string;
  isSelected: boolean;
  onSelect: () => void;
  canEdit: boolean;
  onRename: () => void;
  onDelete: () => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
}

function ThumbnailItem({
  item,
  thumbnailEndpoint,
  isSelected,
  onSelect,
  canEdit,
  onRename,
  onDelete,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
}: ThumbnailItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Fetch thumbnail only when visible
  const { data: thumbnailData, isLoading } = useQuery<{
    thumbnailBase64: string;
    thumbnailMimeType: string;
  }>({
    queryKey: [thumbnailEndpoint, item.id, "thumbnail"],
    queryFn: async () => {
      const response = await apiRequest("GET", `${thumbnailEndpoint}/${item.id}/thumbnail`);
      return await response.json();
    },
    enabled: isVisible,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Format owner name
  const ownerName = item.owner
    ? [item.owner.firstName, item.owner.lastName].filter(Boolean).join(" ") || item.owner.email || "Unknown"
    : "Unknown";

  return (
    <div ref={itemRef} className="relative group">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all border-2",
              isSelected
                ? "border-primary ring-2 ring-primary/30"
                : "border-transparent hover:border-primary/50"
            )}
            onClick={onSelect}
          >
            {/* Thumbnail image or skeleton */}
            {!isVisible || isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : thumbnailData?.thumbnailBase64 ? (
              <img
                src={`data:${thumbnailData.thumbnailMimeType};base64,${thumbnailData.thumbnailBase64}`}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            {/* Privacy indicator overlay */}
            <div className="absolute bottom-1 left-1">
              {item.isPrivate ? (
                <div className="bg-black/60 rounded-full p-1">
                  <Lock className="h-3 w-3 text-white" />
                </div>
              ) : (
                <div className="bg-black/60 rounded-full p-1">
                  <Globe className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {/* Kebab menu - show on hover */}
            {canEdit && (
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 bg-black/60 hover:bg-black/80 text-white"
                    >
                      <EllipsisVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onRename();
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="font-medium truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground">by {ownerName}</p>
        </TooltipContent>
      </Tooltip>

      {/* Rename input - shown below thumbnail when renaming */}
      {isRenaming && (
        <div className="mt-1">
          <Input
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={onRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRenameSubmit();
              } else if (e.key === "Escape") {
                onRenameCancel();
              }
            }}
            autoFocus
            className="h-7 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

interface ThumbnailGridProps {
  items: ThumbnailGridItem[];
  selectedId: string | null;
  onSelect: (item: ThumbnailGridItem) => void;
  thumbnailEndpoint: string;
  canEdit: (item: ThumbnailGridItem) => boolean;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  className?: string;
}

export function ThumbnailGrid({
  items,
  selectedId,
  onSelect,
  thumbnailEndpoint,
  canEdit,
  onRename,
  onDelete,
  isLoading,
  hasMore,
  onLoadMore,
  isLoadingMore,
  className,
}: ThumbnailGridProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isEscapePressed, setIsEscapePressed] = useState(false);

  const handleStartRename = useCallback((item: ThumbnailGridItem) => {
    setRenamingId(item.id);
    setRenameValue(item.title);
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (!isEscapePressed && renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setIsEscapePressed(false);
  }, [isEscapePressed, renamingId, renameValue, onRename]);

  const handleRenameCancel = useCallback(() => {
    setIsEscapePressed(true);
    setRenamingId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">No items found</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2">
        {items.map((item) => (
          <ThumbnailItem
            key={item.id}
            item={item}
            thumbnailEndpoint={thumbnailEndpoint}
            isSelected={selectedId === item.id}
            onSelect={() => onSelect(item)}
            canEdit={canEdit(item)}
            onRename={() => handleStartRename(item)}
            onDelete={() => onDelete(item.id)}
            isRenaming={renamingId === item.id}
            renameValue={renameValue}
            onRenameChange={setRenameValue}
            onRenameSubmit={handleRenameSubmit}
            onRenameCancel={handleRenameCancel}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && onLoadMore && (
        <div className="px-2 pb-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

