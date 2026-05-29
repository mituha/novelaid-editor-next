import { invoke } from '@tauri-apps/api/core';
import { GitClient, GitFileStatus, GitLogEntry } from 'restar-app';

export class TauriGitClient implements GitClient {
  async init(dir: string): Promise<void> {
    await invoke('git_init', { dir });
  }

  async status(dir: string): Promise<GitFileStatus[]> {
    return await invoke<GitFileStatus[]>('git_status', { dir });
  }

  async log(dir: string): Promise<GitLogEntry[]> {
    return await invoke<GitLogEntry[]>('git_log', { dir });
  }

  async add(dir: string, files: string[]): Promise<void> {
    await invoke('git_add', { dir, files });
  }

  async reset(dir: string, files: string[]): Promise<void> {
    await invoke('git_reset', { dir, files });
  }

  async commit(dir: string, message: string): Promise<void> {
    await invoke('git_commit', { dir, message });
  }

  async discard(dir: string, file: string): Promise<void> {
    await invoke('git_discard', { dir, file });
  }

  async getRemotes(dir: string): Promise<string[]> {
    return await invoke<string[]>('git_get_remotes', { dir });
  }

  async currentBranch(dir: string): Promise<string> {
    return await invoke<string>('git_current_branch', { dir });
  }

  async push(dir: string, remote: string, branch: string): Promise<void> {
    await invoke('git_push', { dir, remote, branch });
  }

  async commitFiles(dir: string, hash: string): Promise<GitFileStatus[]> {
    return await invoke<GitFileStatus[]>('git_commit_files', { dir, hash });
  }
}
