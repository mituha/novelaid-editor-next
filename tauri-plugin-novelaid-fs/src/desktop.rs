use std::{path::PathBuf, sync::Mutex};
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
  })
}

/// Access to the novelaid-fs APIs.
pub struct NovelaidFs<R: Runtime> {
  #[allow(dead_code)]
  app: AppHandle<R>,
  project_directory: Mutex<Option<PathBuf>>,
}

impl<R: Runtime> NovelaidFs<R> {
  pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
    Ok(PingResponse {
      value: payload.value,
    })
  }

  pub fn set_project_directory(&self, path: Option<PathBuf>) {
    let mut dir = self.project_directory.lock().unwrap();
    *dir = path;
  }

  pub fn get_project_directory(&self) -> Option<PathBuf> {
    let dir = self.project_directory.lock().unwrap();
    dir.clone()
  }
}
