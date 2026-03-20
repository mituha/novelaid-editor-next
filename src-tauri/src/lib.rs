// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DocumentType {
    Novel,
    Markdown,
    Image,
    Chat,
    GitDiff,
    Browser,
    Css,
    Unknown,
}

#[tauri::command(rename_all = "camelCase")]
fn get_document_type(
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_document_type])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
