You are implementing a "tools layer" that exposes a minimal set of functions (for an LLM) on top of Dynalist. 
The underlying implementation must use the DynalistService class from:
node_modules/@harnyk/dynalist-api/lib/dynalist/DynalistService.d.ts

The goal: the LLM should be able to act as a task/shopping-list manager. 
We want to implement only the **core tools** (no optional extras).

### Tools to implement
1. create_list(name: string, parentId?: string)
   - Create a new list/document.

2. list_lists()
   - List all existing lists/documents.

3. add_items_hierarchically(listId: string, items: Array<{type: "item", level: number, title: string, note?: string, checked?: boolean, checkbox?: boolean, heading?: 0|1|2|3, color?: 0|1|2|3|4|5|6}>)
   - Add items to a list. 
   - Input is a flat array with `level` defining hierarchy.
   - The tools layer must convert this into a TreeNode[] and call DynalistService.createListHierarchically.
   - If the structure is flat (no children), the service layer is smart enough to optimize.

4. get_items_tree(listId: string)
   - Get the current items in tree form with depth info.

5. get_item_children(listId: string, parentNodeId: string)
   - Get direct children of a node.

6. edit_items(listId: string, edits: Array<{ nodeId: string, changes: { content?: string, note?: string, checked?: boolean, checkbox?: boolean, heading?: 0|1|2|3, color?: 0|1|2|3|4|5|6 } }>)
   - Batch edit.

7. delete_items(listId: string, nodeIds: string[])
   - Batch delete.

8. check_items(listId: string, nodeIds: string[], checked: boolean)
   - Batch check/uncheck.

9. clear_checked(listId: string)
   - Remove all checked items from a list.

10. move_items(listId: string, operations: RestructureOperation[])
    - Batch restructure (reorder or reparent).

### Requirements
- You must implement a factory function `createDynalistTools(service: DynalistService)` that returns an object with all the above tools as async functions.
- Each tool must internally call the injected `DynalistService` instance.
- Do not instantiate `DynalistService` inside the tools; it must be provided externally.
- For `add_items_hierarchically`, the input format is `{type, level, title, ...}` (non-recursive). The tool layer must convert it into `TreeNode[]` before passing to the service.
- Code must be TypeScript, clean, and production-ready.
- Focus on correctness and batch efficiency — never loop API calls one by one.

