import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/utils/cn";

interface Props<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  onRowClick?: (row: T) => void;
  minWidth?: number;
  emptyText?: string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  minWidth,
  emptyText = "Tidak ada data.",
}: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
      <Table style={minWidth ? { minWidth } : undefined}>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow
              key={hg.id}
              className="border-black/5 bg-muted/40 hover:bg-muted/40"
            >
              {hg.headers.map((h) => {
                const canSort = h.column.getCanSort();
                return (
                  <TableHead
                    key={h.id}
                    className="h-11 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    {h.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow className="border-black/5 hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="py-8 text-center text-sm text-muted-foreground sm:py-12"
              >
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((r) => (
              <TableRow
                key={r.id}
                className={cn(
                  "border-black/5 transition-colors hover:bg-brand-blue/4",
                  onRowClick && "cursor-pointer",
                )}
                onClick={() => onRowClick?.(r.original)}
              >
                {r.getVisibleCells().map((c) => (
                  <TableCell key={c.id} className="h-14 px-4">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
