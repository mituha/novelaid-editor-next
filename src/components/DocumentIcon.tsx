import React from 'react';
import {
  BookText,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  GitBranch,
  Globe,
  FileCode,
  File,
  Folder,
  FolderOpen,
  LucideProps
} from 'lucide-react';
import { NovelaidDocumentType } from 'tauri-plugin-novelaid-fs-api';

interface DocumentIconProps extends LucideProps {
  type: NovelaidDocumentType;
  isFolder: boolean;
  isOpen?: boolean;
}

/**
 * ドキュメントタイプとファイル・フォルダーの区別に応じたアイコンを表示するコンポーネントです。
 */
export const DocumentIcon: React.FC<DocumentIconProps> = ({
  type,
  isFolder,
  isOpen = false,
  size = 18,
  ...props
}) => {
  if (isFolder) {
    const folderColor = type === 'novel' ? 'var(--accent-color, #ff69b4)' : undefined;
    return isOpen
      ? <FolderOpen size={size} color={folderColor} {...props} />
      : <Folder size={size} color={folderColor} {...props} />;
  }

  switch (type) {
    case 'novel':
      return <BookText size={size} {...props} />;
    case 'markdown':
      return <FileText size={size} color="#42a5f5" {...props} />;
    case 'image':
      return <ImageIcon size={size} color="#66bb6a" {...props} />;
    case 'chat':
      return <MessageSquare size={size} color="#ffa726" {...props} />;
    case 'gitDiff':
      return <GitBranch size={size} color="#ef5350" {...props} />;
    case 'browser':
      return <Globe size={size} color="#26c6da" {...props} />;
    case 'css':
      return <FileCode size={size} color="#7e57c2" {...props} />;
    default:
      return <File size={size} {...props} />;
  }
};
