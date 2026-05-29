use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitFileStatus {
    pub path: String,
    pub index: String,
    pub working_dir: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitLogEntry {
    pub hash: String,
    pub date: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub refs: String,
    pub parents: Vec<String>,
}

fn run_git_cmd(dir: &str, args: &[&str]) -> Result<String, String> {
    let mut final_args = vec!["-c", "core.quotepath=false"];
    final_args.extend_from_slice(args);

    let output = Command::new("git")
        .args(&final_args)
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Gitコマンドの実行に失敗しました: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into_owned())
    }
}

#[tauri::command]
pub async fn git_init(dir: String) -> Result<(), String> {
    run_git_cmd(&dir, &["init"])?;
    Ok(())
}

#[tauri::command]
pub async fn git_status(dir: String) -> Result<Vec<GitFileStatus>, String> {
    let output = run_git_cmd(&dir, &["status", "--porcelain", "-u"])?;
    let mut files = Vec::new();

    for line in output.lines() {
        if line.len() < 4 {
            continue;
        }

        let index = line.chars().next().unwrap().to_string();
        let working_dir = line.chars().nth(1).unwrap().to_string();
        let mut path = line[3..].trim().to_string();

        // ダブルクォートの除去
        if path.starts_with('"') && path.ends_with('"') {
            path = path[1..path.len() - 1].to_string();
        }

        // リネーム時の処理 (old -> new)
        if path.contains(" -> ") {
            let parts: Vec<&str> = path.split(" -> ").collect();
            if parts.len() == 2 {
                path = parts[1].trim().trim_matches('"').to_string();
            }
        }

        files.push(GitFileStatus {
            path,
            index,
            working_dir,
        });
    }

    Ok(files)
}

#[tauri::command]
pub async fn git_log(dir: String) -> Result<Vec<GitLogEntry>, String> {
    // 履歴がない場合はエラー（空のVecを返す）になるようハンドリング
    let output = match run_git_cmd(
        &dir,
        &[
            "log",
            "--all",
            "--pretty=format:%H%n%aI%n%s%n%D%n%aN%n%aE%n%P%x00",
        ],
    ) {
        Ok(out) => out,
        Err(_) => return Ok(Vec::new()),
    };

    let mut entries = Vec::new();
    // ヌルバイトでコミットごとに分割
    for commit_chunk in output.split('\x00') {
        let clean_chunk = commit_chunk.trim();
        if clean_chunk.is_empty() {
            continue;
        }

        let lines: Vec<&str> = clean_chunk.split('\n').collect();
        if lines.len() >= 6 {
            let hash = lines[0].to_string();
            let date = lines[1].to_string();
            let message = lines[2].to_string();
            let refs = lines[3].to_string();
            let author_name = lines[4].to_string();
            let author_email = lines[5].to_string();
            
            let parents = if lines.len() >= 7 && !lines[6].trim().is_empty() {
                lines[6].trim().split(' ').map(|s| s.to_string()).collect()
            } else {
                Vec::new()
            };

            entries.push(GitLogEntry {
                hash,
                date,
                message,
                author_name,
                author_email,
                refs,
                parents,
            });
        }
    }

    Ok(entries)
}

#[tauri::command]
pub async fn git_add(dir: String, files: Vec<String>) -> Result<(), String> {
    if files.is_empty() {
        return Ok(());
    }
    let mut args = vec!["add"];
    for file in &files {
        args.push(file);
    }
    run_git_cmd(&dir, &args)?;
    Ok(())
}

#[tauri::command]
pub async fn git_reset(dir: String, files: Vec<String>) -> Result<(), String> {
    if files.is_empty() {
        return Ok(());
    }
    let mut args = vec!["reset", "HEAD", "--"];
    for file in &files {
        args.push(file);
    }
    run_git_cmd(&dir, &args)?;
    Ok(())
}

#[tauri::command]
pub async fn git_commit(dir: String, message: String) -> Result<(), String> {
    run_git_cmd(&dir, &["commit", "-m", &message])?;
    Ok(())
}

#[tauri::command]
pub async fn git_discard(dir: String, file: String) -> Result<(), String> {
    // ファイルステータスをチェック
    let status_output = match run_git_cmd(&dir, &["status", "--porcelain", "--", &file]) {
        Ok(out) => out,
        Err(_) => "".to_string(),
    };

    if status_output.starts_with("??") {
        // 未追跡ファイルの場合は削除
        let full_path = Path::new(&dir).join(&file);
        if full_path.exists() {
            if full_path.is_dir() {
                std::fs::remove_dir_all(&full_path)
                    .map_err(|e| format!("フォルダの削除に失敗しました: {}", e))?;
            } else {
                std::fs::remove_file(&full_path)
                    .map_err(|e| format!("ファイルの削除に失敗しました: {}", e))?;
            }
        }
    } else {
        // 追跡済みの場合はチェックアウト
        run_git_cmd(&dir, &["checkout", "--", &file])?;
    }
    Ok(())
}

#[tauri::command]
pub async fn git_get_remotes(dir: String) -> Result<Vec<String>, String> {
    let output = match run_git_cmd(&dir, &["remote"]) {
        Ok(out) => out,
        Err(_) => return Ok(Vec::new()),
    };
    let remotes = output
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    Ok(remotes)
}

#[tauri::command]
pub async fn git_current_branch(dir: String) -> Result<String, String> {
    let output = match run_git_cmd(&dir, &["branch", "--show-current"]) {
        Ok(out) => out.trim().to_string(),
        Err(_) => {
            // fallback: rev-parse
            match run_git_cmd(&dir, &["rev-parse", "--abbrev-ref", "HEAD"]) {
                Ok(out) => out.trim().to_string(),
                Err(_) => "".to_string(),
            }
        }
    };
    Ok(output)
}

#[tauri::command]
pub async fn git_push(dir: String, remote: String, branch: String) -> Result<(), String> {
    run_git_cmd(&dir, &["push", &remote, &branch])?;
    Ok(())
}

#[tauri::command]
pub async fn git_commit_files(dir: String, hash: String) -> Result<Vec<GitFileStatus>, String> {
    let output = run_git_cmd(
        &dir,
        &["diff-tree", "--no-commit-id", "--name-status", "-r", &hash],
    )?;
    let mut files = Vec::new();

    for line in output.lines() {
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let status_code = parts[0].to_string();
            let path = parts[1..].join(" ");
            files.push(GitFileStatus {
                path,
                index: status_code.clone(),
                working_dir: status_code,
            });
        }
    }

    Ok(files)
}

#[tauri::command]
pub async fn git_diff(dir: String, path: String, staged: bool) -> Result<String, String> {
    // 未追跡かチェック
    let status_output = match run_git_cmd(&dir, &["status", "--porcelain", "--", &path]) {
        Ok(out) => out,
        Err(_) => "".to_string(),
    };

    if !staged && status_output.starts_with("??") {
        let full_path = Path::new(&dir).join(&path);
        if full_path.exists() {
            let content = std::fs::read_to_string(&full_path)
                .map_err(|e| format!("ファイルの読み込みに失敗しました: {}", e))?;
            let mut diff = String::new();
            for line in content.lines() {
                diff.push('+');
                diff.push_str(line);
                diff.push('\n');
            }
            Ok(diff)
        } else {
            Ok("".to_string())
        }
    } else if staged {
        run_git_cmd(&dir, &["diff", "--staged", "--", &path])
    } else {
        run_git_cmd(&dir, &["diff", "--", &path])
    }
}
