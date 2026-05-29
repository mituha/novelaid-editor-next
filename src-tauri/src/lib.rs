mod git;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_novelaid_fs::init())
        .invoke_handler(tauri::generate_handler![
            git::git_init,
            git::git_status,
            git::git_log,
            git::git_add,
            git::git_reset,
            git::git_commit,
            git::git_discard,
            git::git_get_remotes,
            git::git_current_branch,
            git::git_push,
            git::git_commit_files,
            git::git_diff
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


