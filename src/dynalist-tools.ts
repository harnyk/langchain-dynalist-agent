import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { DynalistService } from '@harnyk/dynalist-api';
// TreeNode and RestructureOperation types
type TreeNode = {
  content: string;
  note?: string;
  checked?: boolean;
  checkbox?: boolean;
  heading?: 0 | 1 | 2 | 3;
  color?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  children?: TreeNode[];
};

type RestructureOperation = {
  nodeId: string;
  newParent?: string;
  newIndex: number;
};

export interface HierarchicalItem {
  type: 'item';
  level: number;
  title: string;
  note?: string;
  checked?: boolean;
  checkbox?: boolean;
  heading?: 0 | 1 | 2 | 3;
  color?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export interface ItemEdit {
  nodeId: string;
  changes: {
    content?: string;
    note?: string;
    checked?: boolean;
    checkbox?: boolean;
    heading?: 0 | 1 | 2 | 3;
    color?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  };
}

function convertHierarchicalToTree(items: HierarchicalItem[]): TreeNode[] {
  const stack: Array<{ node: TreeNode; level: number }> = [];
  const result: TreeNode[] = [];

  for (const item of items) {
    const node: TreeNode = {
      content: item.title,
      note: item.note,
      checked: item.checked,
      checkbox: item.checkbox,
      heading: item.heading,
      color: item.color,
      children: []
    };

    while (stack.length > 0 && stack[stack.length - 1]!.level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      result.push(node);
    } else {
      const parent = stack[stack.length - 1]?.node;
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      }
    }

    stack.push({ node, level: item.level });
  }

  return result;
}

export function createDynalistTools(service: DynalistService) {
  return [
    tool(
      async (input) => {
        const { name, parentId } = input as { name: string; parentId?: string };
        if (!parentId) {
          throw new Error('parentId is required to create a list. Use one of the folder IDs from list_lists.');
        }
        const result = await service.createList(name, parentId);
        return { id: result.id };
      },
      {
        name: 'create_list',
        description: 'Create a new Dynalist document/list in a specific parent folder. Requires a parent folder ID from list_lists.',
        schema: z.object({
          name: z.string().describe('Name of the new list'),
          parentId: z.string().describe('Parent folder ID (required - get from list_lists)')
        })
      }
    ),

    tool(
      async () => {
        const lists = await service.listLists();
        return JSON.stringify(lists, null, 2);
      },
      {
        name: 'list_lists',
        description: 'Get all available Dynalist documents/lists',
        schema: z.object({})
      }
    ),

    tool(
      async (input) => {
        const { listId, items } = input as { listId: string; items: HierarchicalItem[] };
        const treeNodes = convertHierarchicalToTree(items);
        const result = await service.createListHierarchically(listId, treeNodes);
        return { rootNodes: result.rootNodes };
      },
      {
        name: 'add_items_hierarchically',
        description: 'Add multiple items to a list with hierarchical structure based on levels',
        schema: z.object({
          listId: z.string().describe('ID of the list to add items to'),
          items: z.array(z.object({
            type: z.literal('item'),
            level: z.number().describe('Hierarchy level (0 for root, 1 for child, etc.)'),
            title: z.string().describe('Item content/title'),
            note: z.string().optional().describe('Optional note for the item'),
            checked: z.boolean().optional().describe('Whether item is checked'),
            checkbox: z.boolean().optional().describe('Whether to show checkbox'),
            heading: z.number().min(0).max(3).optional().describe('Heading level (0-3)'),
            color: z.number().min(0).max(6).optional().describe('Color (0-6)')
          })).describe('Array of hierarchical items to add')
        })
      }
    ),

    tool(
      async (input) => {
        const { listId } = input as { listId: string };
        const items = await service.getItemsWithTree(listId);
        return JSON.stringify(items, null, 2);
      },
      {
        name: 'get_items_tree',
        description: 'Get all items in a list as a hierarchical tree structure',
        schema: z.object({
          listId: z.string().describe('ID of the list to get items from')
        })
      }
    ),

    tool(
      async (input) => {
        const { listId, parentNodeId } = input as { listId: string; parentNodeId: string };
        const children = await service.getItemChildren(listId, parentNodeId);
        return JSON.stringify(children, null, 2);
      },
      {
        name: 'get_item_children',
        description: 'Get direct children of a specific item in a list',
        schema: z.object({
          listId: z.string().describe('ID of the list'),
          parentNodeId: z.string().describe('ID of the parent node to get children from')
        })
      }
    ),

    tool(
      async (input) => {
        const { listId, edits } = input as { listId: string; edits: ItemEdit[] };
        const serviceEdits = edits.map((edit: ItemEdit) => ({
          nodeId: edit.nodeId,
          changes: edit.changes
        }));
        return await service.editItems(listId, serviceEdits);
      },
      {
        name: 'edit_items',
        description: 'Edit multiple items (content, notes, formatting) in a list',
        schema: z.object({
          listId: z.string().describe('ID of the list'),
          edits: z.array(z.object({
            nodeId: z.string().describe('ID of the item to edit'),
            changes: z.object({
              content: z.string().optional().describe('New content/title'),
              note: z.string().optional().describe('New note'),
              checked: z.boolean().optional().describe('New checked state'),
              checkbox: z.boolean().optional().describe('Show/hide checkbox'),
              heading: z.number().min(0).max(3).optional().describe('Heading level (0-3)'),
              color: z.number().min(0).max(6).optional().describe('Color (0-6)')
            }).describe('Changes to apply')
          })).describe('Array of edits to apply')
        })
      }
    ),

    tool(
      async (input) => {
        const { listId, nodeIds } = input as { listId: string; nodeIds: string[] };
        return await service.deleteItems(listId, nodeIds);
      },
      {
        name: 'delete_items',
        description: 'Delete multiple items from a list by their IDs',
        schema: z.object({
          listId: z.string().describe('ID of the list'),
          nodeIds: z.array(z.string()).describe('Array of item IDs to delete')
        })
      }
    ),

    tool(
      async (input) => {
        const { listId, nodeIds, checked } = input as { listId: string; nodeIds: string[]; checked: boolean };
        return await service.checkItems(listId, nodeIds, checked);
      },
      {
        name: 'check_items',
        description: 'Check or uncheck multiple items in a list',
        schema: z.object({
          listId: z.string().describe('ID of the list'),
          nodeIds: z.array(z.string()).describe('Array of item IDs to check/uncheck'),
          checked: z.boolean().describe('Whether to check (true) or uncheck (false) the items')
        })
      }
    ),

    tool(
      async (input) => {
        const { listId } = input as { listId: string };
        return await service.clearList(listId);
      },
      {
        name: 'clear_checked',
        description: 'Remove all checked items from a list',
        schema: z.object({
          listId: z.string().describe('ID of the list to clear checked items from')
        })
      }
    ),

    tool(
      async (input) => {
        const { listId, operations } = input as { listId: string; operations: RestructureOperation[] };
        return await service.restructureItems(listId, operations);
      },
      {
        name: 'move_items',
        description: 'Move multiple items to new positions or parents in a list',
        schema: z.object({
          listId: z.string().describe('ID of the list'),
          operations: z.array(z.object({
            nodeId: z.string().describe('ID of the item to move'),
            newParent: z.string().optional().describe('New parent ID (optional)'),
            newIndex: z.number().describe('New position index')
          })).describe('Array of move operations')
        })
      }
    )
  ];
}