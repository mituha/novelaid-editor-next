import { NovelaidDocumentType } from 'tauri-plugin-novelaid-fs-api';

/**
 * ファイルの拡張子からドキュメントタイプを推定します。
 */
export function getDocumentTypeByExtension(fileName: string): NovelaidDocumentType {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (!ext) return 'unknown';

  switch (ext) {
    case 'txt':
      return 'novel';
    case 'md':
      return 'markdown';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'bmp':
    case 'tiff':
    case 'ico':
      return 'image';
    case 'chat':
      return 'chat';
    case 'css':
      return 'css';
    default:
      return 'unknown';
  }
}

/**
 * フォルダー名からドキュメントタイプを推定します。
 */
export function getFolderDocumentType(folderName: string, parentType: NovelaidDocumentType = 'novel'): NovelaidDocumentType {
  const name = folderName.toLowerCase();

  if (name.includes('小説') || name.includes('novel')) {
    return 'novel';
  }
  if (name.includes('設定') || name.includes('プロット') || name.includes('wiki') || name.includes('markdown')) {
    return 'markdown';
  }
  if (name.includes('画像') || name.includes('image')) {
    return 'image';
  }

  // 明確な指定がない場合は親のタイプを継承
  return parentType;
}

/**
 * ドキュメントタイプに応じたデフォルトの拡張子を返します。
 */
export function getDefaultExtensionByDocumentType(type: NovelaidDocumentType): string {
  switch (type) {
    case 'novel':
      return '.txt';
    case 'markdown':
      return '.md';
    case 'chat':
      return '.chat';
    case 'css':
      return '.css';
    default:
      return '';
  }
}
