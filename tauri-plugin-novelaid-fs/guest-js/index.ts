import { invoke } from '@tauri-apps/api/core'
import { NovelaidDocumentType, NovelaidDirEntry, NovelaidDocument } from './models'

export * from './models'

export async function ping(value: string): Promise<string | null> {
  return await invoke<{ value?: string }>('plugin:novelaid-fs|ping', {
    payload: {
      value,
    },
  }).then((r) => (r.value ? r.value : null));
}

export async function getDocumentType(
  path: string,
): Promise<NovelaidDocumentType> {
  return await invoke<NovelaidDocumentType>('plugin:novelaid-fs|get_document_type', {
    path,
  });
}

export async function getDirectoryType(
  path: string,
  parentType?: NovelaidDocumentType
): Promise<NovelaidDocumentType> {
  return await invoke<NovelaidDocumentType>('plugin:novelaid-fs|get_directory_type', {
    path,
    parentType,
  });
}

export async function setProjectDirectory(path: string | null): Promise<void> {
  await invoke('plugin:novelaid-fs|set_project_directory', {
    path,
  });
}

export async function getProjectDirectory(): Promise<string | null> {
  return await invoke<string | null>('plugin:novelaid-fs|get_project_directory');
}
export async function readDirectory(
  path: string,
  recursive: boolean = false,
  parentType?: NovelaidDocumentType
): Promise<NovelaidDirEntry[]> {
  return await invoke<NovelaidDirEntry[]>('plugin:novelaid-fs|read_directory', {
    path,
    recursive,
    parentType,
  });
}

export async function readDocument(path: string): Promise<NovelaidDocument> {
  return await invoke<NovelaidDocument>('plugin:novelaid-fs|read_document', {
    path,
  });
}

export async function writeDocument(
  path: string,
  document: NovelaidDocument,
): Promise<void> {
  await invoke('plugin:novelaid-fs|write_document', {
    path,
    document,
  });
}

export async function getMetadataCache(): Promise<Record<string, any>> {
  return await invoke<Record<string, any>>('plugin:novelaid-fs|get_metadata_cache');
}

export async function scanProjectMetadata(): Promise<void> {
  await invoke('plugin:novelaid-fs|scan_project_metadata');
}
