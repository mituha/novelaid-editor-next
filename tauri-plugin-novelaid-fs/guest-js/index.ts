import { invoke } from '@tauri-apps/api/core'
import { NovelaidDocumentType } from './models'

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
  isDirectory: boolean,
  parentType?: NovelaidDocumentType
): Promise<NovelaidDocumentType> {
  return await invoke<NovelaidDocumentType>('plugin:novelaid-fs|get_document_type', {
    path,
    isDirectory,
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

