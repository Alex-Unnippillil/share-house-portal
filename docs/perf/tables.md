# Data table performance and accessibility

The shared `DataTable` primitive under `components/ui/data-table/` wraps TanStack Table + Virtual and ships with the guardrails we need for large result sets and assistive tech users.

## Core capabilities

- **Row virtualization** is on by default through `@tanstack/react-virtual`. Only the visible slice of rows is rendered while maintaining the correct table semantics (`role="grid"`, `aria-rowcount`, and filler rows marked with `aria-hidden`).
- **Column pinning** is supported via TanStack's column pinning state. Left/right pinned cells are rendered with sticky positioning, consistent background colour, and menu actions exposed in each column header.
- **Server-driven sorting & pagination** are opt-in. The table exposes controlled state callbacks so data loaders can keep the UI in sync with remote filters while keeping keyboard + screen reader affordances intact.

## Configuring the component

```tsx
import {
  DataTable,
  type DataTableState,
} from "@/components/ui/data-table";
import type { ColumnDef, ColumnPinningState, SortingState } from "@tanstack/react-table";

const columns: ColumnDef<MyRow>[] = [
  // ...define column defs (see members/todos for examples)
];

const [sorting, setSorting] = React.useState<SortingState>([]);
const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 25 });
const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({
  left: ["name"],
  right: ["actions"],
});

<DataTable
  columns={columns}
  data={rows}
  state={{ sorting, pagination, columnPinning }}
  onSortingChange={setSorting}
  onPaginationChange={setPagination}
  onColumnPinningChange={setColumnPinning}
  manualSorting
  manualPagination
  pageCount={pageCount}
  rowCount={totalRows}
  bodyHeight="28rem"
  estimateRowHeight={54}
  getRowId={(row) => row.id}
/>;
```

Key props:

- `bodyHeight` limits the scroll viewport and activates virtualization. Adjust `estimateRowHeight` if row density changes.
- When attaching to a server data source, set `manualSorting` and/or `manualPagination` to `true` and provide the relevant callbacks/state (`onSortingChange`, `onPaginationChange`, `pageCount`, `rowCount`). The component keeps focusable rows and navigation buttons in sync while data is reloading (`aria-busy` toggles automatically when `isLoading` is true).
- `getRowId` is strongly recommended so virtualised row focus remains stable when results shuffle.

## Column header helpers

Use `DataTableColumnHeader` inside your column definitions to render the accessible sort & pin menu. The dropdown exposes sort ascending/descending/reset plus pin left/right/unpin actions. Headers remain reachable through keyboard controls and show Radix icons for visual status.

```tsx
const columns: ColumnDef<MyRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    id: "actions",
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Actions" className="justify-end" />
    ),
  },
];
```

## Pagination UI

`DataTablePagination` renders the condensed navigation footer used by the members and todos tables. It wires up the current page, page count, and total row summary with ARIA labels that reference the parent grid. You can pass a custom `renderPagination` function to `DataTable` if a screen needs a bespoke footer.

## Accessibility notes

- Rows are tabbable and support arrow key navigation. Moving up/down triggers the virtualizer to keep the focused row visible.
- Column headers announce `aria-sort` changes and the table body announces loading states via `aria-busy`.
- Sticky (pinned) columns reuse the theme background colour so focus rings remain visible in both light and dark modes.

Refer to `app/dashboard/todo/components/ListOfTodo.tsx` and `app/dashboard/members/components/ListOfMembers.tsx` for full usage examples.
