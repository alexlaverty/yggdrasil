"""Pydantic schemas for backup-related endpoints."""

from pydantic import BaseModel


class GitHubBackupRequest(BaseModel):
    repo: str  # format: "owner/repo"
    token: str
    branch: str = "main"
    commit_message: str = "Yggdrasil backup"
