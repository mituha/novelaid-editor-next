const COMMANDS: &[&str] = &[
    "ping",
    "get_document_type",
    "set_project_directory",
    "get_project_directory",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
