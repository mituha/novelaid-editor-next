import { invoke } from '@tauri-apps/api/core'

export type DocumentType =
  | 'novel'
  | 'markdown'
  | 'image'
  | 'chat'
  | 'git-diff'
  | 'browser'
  | 'css'
  | 'unknown'
  | 'external';

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
  parentType?: DocumentType
): Promise<DocumentType> {
  return await invoke<DocumentType>('plugin:novelaid-fs|get_document_type', {
    path,
    isDirectory,
    parentType,
  });
}

