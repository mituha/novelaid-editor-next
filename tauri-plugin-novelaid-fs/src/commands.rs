use tauri::{AppHandle, command, Runtime};

use crate::models::*;
use crate::Result;
use crate::NovelaidFsExt;

#[command]
pub(crate) async fn ping<R: Runtime>(
    app: AppHandle<R>,
    payload: PingRequest,
) -> Result<PingResponse> {
    app.novelaid_fs().ping(payload)
}

#[command]
pub(crate) fn get_document_type(
    path: String,
    is_directory: bool,
    parent_type: Option<DocumentType>,
) -> DocumentType {
    let name = path.to_lowercase();

    if is_directory {
        if name.contains("小説") || name.contains("novel") {
            return DocumentType::Novel;
        }
        if name.contains("設定")
            || name.contains("プロット")
            || name.contains("wiki")
            || name.contains("markdown")
        {
            return DocumentType::Markdown;
        }
        if name.contains("画像") || name.contains("image") {
            return DocumentType::Image;
        }
        return parent_type.unwrap_or(DocumentType::Novel);
    }

    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "txt" => DocumentType::Novel,
        "md" => DocumentType::Markdown,
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "bmp" | "tiff" | "ico" => {
            DocumentType::Image
        }
        "chat" => DocumentType::Chat,
        "css" => DocumentType::Css,
        _ => DocumentType::Unknown,
    }
}

