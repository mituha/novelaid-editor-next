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
) -> NovelaidDocumentType {
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "txt" => NovelaidDocumentType::Novel,
        "md" => NovelaidDocumentType::Markdown,
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "bmp" | "tiff" | "ico" => {
            NovelaidDocumentType::Image
        }
        "chat" => NovelaidDocumentType::Chat,
        "css" => NovelaidDocumentType::Css,
        _ => NovelaidDocumentType::Unknown,
    }
}

#[command]
pub(crate) fn get_directory_type(
    path: String,
    parent_type: Option<NovelaidDocumentType>,
) -> NovelaidDocumentType {
    let name = path.to_lowercase();

    if name.contains("小説") || name.contains("novel") {
        return NovelaidDocumentType::Novel;
    }
    if name.contains("設定")
        || name.contains("プロット")
        || name.contains("wiki")
        || name.contains("markdown")
    {
        return NovelaidDocumentType::Markdown;
    }
    if name.contains("画像") || name.contains("image") {
        return NovelaidDocumentType::Image;
    }
    parent_type.unwrap_or(NovelaidDocumentType::Novel)
}

#[command]
pub(crate) async fn set_project_directory<R: Runtime>(
    app: AppHandle<R>,
    path: Option<String>,
) -> Result<()> {
    app.novelaid_fs()
        .set_project_directory(path.map(std::path::PathBuf::from));
    Ok(())
}

#[command]
pub(crate) async fn get_project_directory<R: Runtime>(
    app: AppHandle<R>,
) -> Result<Option<String>> {
    Ok(app
        .novelaid_fs()
        .get_project_directory()
        .map(|p| p.to_string_lossy().to_string()))
}

