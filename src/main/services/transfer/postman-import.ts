/**
 * Postman collection import service.
 *
 * The pure parsers live in ./postman-parser and ./postman-mapping; this module
 * persists the parsed tree through the collection and request repositories.
 */
import type { CollectionCreateInput, CollectionUpdateInput } from '@shared/ipc';
import type {
  CollectionNode,
  ImportSummary,
  RequestDefinition,
  SavedRequest,
  TransferResult
} from '@shared/types';
import { createLogger } from '../../utils/logger';
import { parsePostmanCollection, type ParsedNode } from './postman-parser';

export {
  MAX_ITEMS,
  parsePostmanCollection,
  parsePostmanEnvironment,
  type ParsedFolderNode,
  type ParsedNode,
  type ParsedPostmanCollection,
  type ParsedPostmanEnvironment,
  type ParsedRequestNode
} from './postman-parser';

const logger = createLogger('postman-import');

export interface CollectionImportTarget {
  create(input: CollectionCreateInput): CollectionNode;
  update(input: CollectionUpdateInput): CollectionNode;
}

export interface RequestImportTarget {
  insertDefinition(collectionId: string, definition: RequestDefinition, order: number): SavedRequest;
}

export class PostmanImporter {
  constructor(
    private readonly collections: CollectionImportTarget,
    private readonly requests: RequestImportTarget
  ) {}

  import(raw: unknown): TransferResult {
    const parsed = parsePostmanCollection(raw);
    const root = this.collections.create({ name: parsed.name, parentId: null, type: 'collection' });
    this.collections.update({
      id: root.id,
      patch: {
        description: parsed.description,
        preRequestScript: parsed.preRequestScript,
        testScript: parsed.testScript
      }
    });
    const summary: ImportSummary = {
      collections: 1,
      folders: 0,
      requests: 0,
      environments: 0,
      skipped: parsed.counts.skipped,
      warnings: [...parsed.warnings]
    };
    this.writeNodes(parsed.nodes, root.id, summary);
    logger.info('Postman collection imported', {
      collectionId: root.id,
      folders: summary.folders,
      requests: summary.requests,
      warnings: summary.warnings.length
    });
    return { summary, importedCollectionIds: [root.id] };
  }

  private writeNodes(nodes: ParsedNode[], parentId: string, summary: ImportSummary): void {
    let order = 1000;
    for (const node of nodes) {
      if (node.kind === 'folder') {
        const folder = this.collections.create({ name: node.name, parentId, type: 'folder' });
        this.collections.update({
          id: folder.id,
          patch: {
            description: node.description,
            preRequestScript: node.preRequestScript,
            testScript: node.testScript
          }
        });
        summary.folders += 1;
        this.writeNodes(node.items, folder.id, summary);
      } else {
        this.requests.insertDefinition(parentId, node.request, order);
        summary.requests += 1;
      }
      order += 1000;
    }
  }
}
