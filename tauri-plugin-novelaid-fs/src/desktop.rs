use std::{path::{Path, PathBuf}, sync::Mutex, collections::HashMap};
use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<NovelaidFs<R>> {
  Ok(NovelaidFs {
    app: app.clone(),
    project_directory: Mutex::new(None),
    metadata_cache: Mutex::new(HashMap::new()),
  })
}

/// Access to the novelaid-fs APIs.
pub struct NovelaidFs<R: Runtime> {
  #[allow(dead_code)]
  app: AppHandle<R>,
  project_directory: Mutex<Option<PathBuf>>,
  metadata_cache: Mutex<HashMap<String, serde_json::Value>>,
}

impl<R: Runtime> NovelaidFs<R> {
  pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
    Ok(PingResponse {
      value: payload.value,
    })
  }

  pub fn set_project_directory(&self, path: Option<PathBuf>) {
    let mut dir = self.project_directory.lock().unwrap();
    *dir = path.clone();
    
    // Clear cache and trigger scan if path is set
    {
      let mut cache = self.metadata_cache.lock().unwrap();
      cache.clear();
    }
    
    if let Some(p) = path {
      let _ = self.scan_metadata_internal(&p);
    }
  }

  pub fn get_project_directory(&self) -> Option<PathBuf> {
    let dir = self.project_directory.lock().unwrap();
    dir.clone()
  }

  pub fn read_document(&self, path: &Path) -> crate::Result<NovelaidDocument> {
    let content = std::fs::read_to_string(path).map_err(crate::Error::Io)?;
    let (metadata, body) = self.extract_frontmatter(&content);
    
    let document_type = self.get_document_type_internal(path);
    
    // Update cache
    {
      let mut cache = self.metadata_cache.lock().unwrap();
      cache.insert(path.to_string_lossy().to_string(), metadata.clone());
    }

    Ok(NovelaidDocument {
      content: body.to_string(),
      metadata,
      document_type,
    })
  }

  pub fn write_document(&self, path: &Path, document: NovelaidDocument) -> crate::Result<()> {
    let full_content = self.format_frontmatter(&document.metadata, &document.content);
    std::fs::write(path, full_content).map_err(crate::Error::Io)?;
    
    // Update cache
    {
      let mut cache = self.metadata_cache.lock().unwrap();
      cache.insert(path.to_string_lossy().to_string(), document.metadata);
    }
    
    Ok(())
  }

  pub fn get_metadata_cache(&self) -> HashMap<String, serde_json::Value> {
    let cache = self.metadata_cache.lock().unwrap();
    cache.clone()
  }

  pub fn scan_project_metadata(&self) -> crate::Result<()> {
    let dir = self.get_project_directory();
    if let Some(p) = dir {
      self.scan_metadata_internal(&p)?;
    }
    Ok(())
  }

  fn scan_metadata_internal(&self, path: &Path) -> crate::Result<()> {
    if path.is_dir() {
      for entry in std::fs::read_dir(path).map_err(crate::Error::Io)? {
        let entry = entry.map_err(crate::Error::Io)?;
        let path = entry.path();
        if path.is_dir() {
          self.scan_metadata_internal(&path)?;
        } else {
          let doc_type = self.get_document_type_internal(&path);
          if matches!(doc_type, NovelaidDocumentType::Novel | NovelaidDocumentType::Markdown) {
            let _ = self.read_document(&path); // This will update the cache
          }
        }
      }
    }
    Ok(())
  }

  fn extract_frontmatter<'a>(&self, content: &'a str) -> (serde_json::Value, &'a str) {
    if !content.starts_with("---\n") && !content.starts_with("---\r\n") {
      return (serde_json::json!({}), content);
    }

    let splitter = if content.contains("\r\n") { "\r\n" } else { "\n" };
    let fence = format!("---{}", splitter);
    
    let parts: Vec<&str> = content.splitn(3, &fence).collect();
    if parts.len() < 3 {
      return (serde_json::json!({}), content);
    }

    let yaml_str = parts[1];
    let body = parts[2];

    match serde_yaml::from_str::<serde_json::Value>(yaml_str) {
      Ok(metadata) => (metadata, body),
      Err(_) => (serde_json::json!({}), content),
    }
  }

  fn format_frontmatter(&self, metadata: &serde_json::Value, content: &str) -> String {
    if metadata.is_object() && !metadata.as_object().unwrap().is_empty() {
      match serde_yaml::to_string(metadata) {
        Ok(yaml_str) => {
          // serde_yaml adds "---\n" at the start, we might need to adjust
          format!("---\n{}---\n{}", yaml_str.trim_start_matches("---\n"), content)
        }
        Err(_) => content.to_string(),
      }
    } else {
      content.to_string()
    }
  }

  fn get_document_type_internal(&self, path: &Path) -> NovelaidDocumentType {
    let ext = path.extension()
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
}
