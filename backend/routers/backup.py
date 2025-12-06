"""API routes for backup and restore functionality."""

import io
import os
import json
import base64
import zipfile
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import requests

from database import get_db
from models import (
    Individual, Family, Event, Media, Place,
    individual_event, family_event, child_in_family, media_individual, media_event
)
from schemas.backup import GitHubBackupRequest
from services.storage import minio_client

router = APIRouter(prefix="/backup", tags=["backup"])


@router.get("/export")
async def export_backup(db: Session = Depends(get_db)):
    """Export all data to a ZIP file containing JSON and media files."""
    try:
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Export individuals
            individuals = db.query(Individual).all()
            individuals_data = [{
                "id": ind.id,
                "gedcom_id": ind.gedcom_id,
                "first_name": ind.first_name,
                "last_name": ind.last_name,
                "sex": ind.sex,
                "profile_image_id": ind.profile_image_id
            } for ind in individuals]
            zip_file.writestr("data/individuals.json", json.dumps(individuals_data, indent=2))

            # Export families
            families = db.query(Family).all()
            families_data = [{
                "id": fam.id,
                "gedcom_id": fam.gedcom_id,
                "spouse1_id": fam.spouse1_id,
                "spouse2_id": fam.spouse2_id
            } for fam in families]
            zip_file.writestr("data/families.json", json.dumps(families_data, indent=2))

            # Export events
            events = db.query(Event).all()
            events_data = [{
                "id": evt.id,
                "event_type": evt.event_type,
                "event_date": evt.event_date.isoformat() if evt.event_date else None,
                "place": evt.place,
                "description": evt.description
            } for evt in events]
            zip_file.writestr("data/events.json", json.dumps(events_data, indent=2))

            # Export media metadata
            media_list = db.query(Media).all()
            media_data = [{
                "id": m.id,
                "filename": m.filename,
                "file_path": m.file_path,
                "media_type": m.media_type,
                "file_size": m.file_size,
                "media_date": m.media_date.isoformat() if m.media_date else None,
                "description": m.description,
                "extracted_text": m.extracted_text
            } for m in media_list]
            zip_file.writestr("data/media.json", json.dumps(media_data, indent=2))

            # Export places (geocoded locations)
            places = db.query(Place).all()
            places_data = [{
                "id": p.id,
                "name": p.name,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "geocoded": p.geocoded
            } for p in places]
            zip_file.writestr("data/places.json", json.dumps(places_data, indent=2))

            # Export relationships
            relationships = {
                "individual_events": [],
                "family_events": [],
                "child_in_family": [],
                "media_individuals": [],
                "media_events": []
            }

            for ind in individuals:
                for evt in ind.events:
                    relationships["individual_events"].append({
                        "individual_id": ind.id,
                        "event_id": evt.id
                    })

            for fam in families:
                for evt in fam.events:
                    relationships["family_events"].append({
                        "family_id": fam.id,
                        "event_id": evt.id
                    })

            for fam in families:
                for child in fam.children:
                    relationships["child_in_family"].append({
                        "child_id": child.id,
                        "family_id": fam.id
                    })

            for m in media_list:
                for ind in m.individuals:
                    relationships["media_individuals"].append({
                        "media_id": m.id,
                        "individual_id": ind.id
                    })

            for m in media_list:
                for evt in m.events:
                    relationships["media_events"].append({
                        "media_id": m.id,
                        "event_id": evt.id
                    })

            zip_file.writestr("data/relationships.json", json.dumps(relationships, indent=2))

            # Export media files from MinIO
            for m in media_list:
                try:
                    response = minio_client.get_object("media", m.file_path)
                    file_data = response.read()
                    zip_file.writestr(f"media/{m.file_path}", file_data)
                except Exception as e:
                    print(f"Warning: Could not export media file {m.file_path}: {e}")

            # Create manifest
            manifest = {
                "export_date": datetime.now().isoformat(),
                "version": "1.0",
                "counts": {
                    "individuals": len(individuals_data),
                    "families": len(families_data),
                    "events": len(events_data),
                    "media": len(media_data),
                    "places": len(places_data)
                }
            }
            zip_file.writestr("manifest.json", json.dumps(manifest, indent=2))

        zip_buffer.seek(0)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"yggdrasil_backup_{timestamp}.zip"

        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        print(f"Error exporting backup: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error exporting backup: {str(e)}")


@router.post("/import")
async def import_backup(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import data from a backup ZIP file."""
    try:
        contents = await file.read()
        zip_buffer = io.BytesIO(contents)

        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            # Read manifest
            try:
                manifest = json.loads(zip_file.read("manifest.json"))
                print(f"Importing backup from {manifest.get('export_date', 'unknown date')}")
            except KeyError:
                raise HTTPException(status_code=400, detail="Invalid backup file: missing manifest.json")

            # Clear existing data
            db.execute(media_event.delete())
            db.execute(media_individual.delete())
            db.execute(individual_event.delete())
            db.execute(family_event.delete())
            db.execute(child_in_family.delete())
            db.query(Media).delete()
            db.query(Event).delete()
            db.query(Family).delete()
            db.query(Individual).delete()
            db.query(Place).delete()
            db.commit()

            # Import individuals
            individuals_json = json.loads(zip_file.read("data/individuals.json"))
            id_map_individuals = {}
            profile_image_map = {}
            for ind_data in individuals_json:
                old_id = ind_data.pop("id")
                old_profile_image_id = ind_data.pop("profile_image_id", None)
                if old_profile_image_id:
                    profile_image_map[old_id] = old_profile_image_id
                ind = Individual(**ind_data)
                db.add(ind)
                db.flush()
                id_map_individuals[old_id] = ind.id

            # Import families
            families_json = json.loads(zip_file.read("data/families.json"))
            id_map_families = {}
            for fam_data in families_json:
                old_id = fam_data.pop("id")
                if fam_data.get("spouse1_id"):
                    fam_data["spouse1_id"] = id_map_individuals.get(fam_data["spouse1_id"])
                if fam_data.get("spouse2_id"):
                    fam_data["spouse2_id"] = id_map_individuals.get(fam_data["spouse2_id"])
                fam = Family(**fam_data)
                db.add(fam)
                db.flush()
                id_map_families[old_id] = fam.id

            # Import events
            events_json = json.loads(zip_file.read("data/events.json"))
            id_map_events = {}
            for evt_data in events_json:
                old_id = evt_data.pop("id")
                if evt_data.get("event_date"):
                    evt_data["event_date"] = datetime.fromisoformat(evt_data["event_date"]).date()
                evt = Event(**evt_data)
                db.add(evt)
                db.flush()
                id_map_events[old_id] = evt.id

            # Import media metadata
            media_json = json.loads(zip_file.read("data/media.json"))
            id_map_media = {}
            for m_data in media_json:
                old_id = m_data.pop("id")
                if m_data.get("media_date"):
                    m_data["media_date"] = datetime.fromisoformat(m_data["media_date"]).date()
                m = Media(**m_data)
                db.add(m)
                db.flush()
                id_map_media[old_id] = m.id

            # Import places (geocoded locations)
            places_json = []
            try:
                places_json = json.loads(zip_file.read("data/places.json"))
                for p_data in places_json:
                    p_data.pop("id", None)  # Remove old id
                    place = Place(**p_data)
                    db.add(place)
            except KeyError:
                # places.json may not exist in older backups
                print("Note: places.json not found in backup, skipping places import")

            # Import relationships
            relationships = json.loads(zip_file.read("data/relationships.json"))

            for rel in relationships.get("individual_events", []):
                new_ind_id = id_map_individuals.get(rel["individual_id"])
                new_evt_id = id_map_events.get(rel["event_id"])
                if new_ind_id and new_evt_id:
                    db.execute(individual_event.insert().values(
                        individual_id=new_ind_id,
                        event_id=new_evt_id
                    ))

            for rel in relationships.get("family_events", []):
                new_fam_id = id_map_families.get(rel["family_id"])
                new_evt_id = id_map_events.get(rel["event_id"])
                if new_fam_id and new_evt_id:
                    db.execute(family_event.insert().values(
                        family_id=new_fam_id,
                        event_id=new_evt_id
                    ))

            for rel in relationships.get("child_in_family", []):
                new_child_id = id_map_individuals.get(rel["child_id"])
                new_fam_id = id_map_families.get(rel["family_id"])
                if new_child_id and new_fam_id:
                    db.execute(child_in_family.insert().values(
                        child_id=new_child_id,
                        family_id=new_fam_id
                    ))

            for rel in relationships.get("media_individuals", []):
                new_media_id = id_map_media.get(rel["media_id"])
                new_ind_id = id_map_individuals.get(rel["individual_id"])
                if new_media_id and new_ind_id:
                    db.execute(media_individual.insert().values(
                        media_id=new_media_id,
                        individual_id=new_ind_id
                    ))

            for rel in relationships.get("media_events", []):
                new_media_id = id_map_media.get(rel["media_id"])
                new_evt_id = id_map_events.get(rel["event_id"])
                if new_media_id and new_evt_id:
                    db.execute(media_event.insert().values(
                        media_id=new_media_id,
                        event_id=new_evt_id
                    ))

            # Restore profile_image_id
            for old_ind_id, old_profile_image_id in profile_image_map.items():
                new_ind_id = id_map_individuals.get(old_ind_id)
                new_media_id = id_map_media.get(old_profile_image_id)
                if new_ind_id and new_media_id:
                    ind = db.query(Individual).filter(Individual.id == new_ind_id).first()
                    if ind:
                        ind.profile_image_id = new_media_id

            db.commit()

            # Import media files to MinIO
            media_files_imported = 0
            for m_data in media_json:
                file_path = m_data["file_path"]
                try:
                    media_content = zip_file.read(f"media/{file_path}")
                    minio_client.put_object(
                        "media",
                        file_path,
                        io.BytesIO(media_content),
                        len(media_content)
                    )
                    media_files_imported += 1
                except KeyError:
                    print(f"Warning: Media file not found in backup: {file_path}")
                except Exception as e:
                    print(f"Warning: Could not import media file {file_path}: {e}")

            return {
                "message": "Backup imported successfully",
                "imported": {
                    "individuals": len(individuals_json),
                    "families": len(families_json),
                    "events": len(events_json),
                    "media": len(media_json),
                    "media_files": media_files_imported,
                    "places": len(places_json)
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error importing backup: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error importing backup: {str(e)}")


@router.get("/github/config")
async def get_github_config():
    """Return GitHub backup configuration from environment variables."""
    return {
        "repo": os.getenv("GITHUB_BACKUP_REPO", ""),
        "token": os.getenv("GITHUB_BACKUP_TOKEN", ""),
        "branch": os.getenv("GITHUB_BACKUP_BRANCH", "main")
    }


@router.post("/github/export")
async def export_to_github(config: GitHubBackupRequest, db: Session = Depends(get_db)):
    """Export all data directly to a GitHub repository."""
    try:
        github_api = "https://api.github.com"
        headers = {
            "Authorization": f"token {config.token}",
            "Accept": "application/vnd.github.v3+json"
        }

        # Verify repo access
        repo_response = requests.get(f"{github_api}/repos/{config.repo}", headers=headers)
        if repo_response.status_code == 404:
            raise HTTPException(status_code=404, detail="Repository not found or no access")
        if repo_response.status_code != 200:
            raise HTTPException(status_code=repo_response.status_code, detail=f"GitHub API error: {repo_response.text}")

        # Prepare all data files
        files_to_commit = {}

        individuals = db.query(Individual).all()
        individuals_data = [{"id": ind.id, "gedcom_id": ind.gedcom_id, "first_name": ind.first_name, "last_name": ind.last_name, "sex": ind.sex} for ind in individuals]
        files_to_commit["data/individuals.json"] = json.dumps(individuals_data, indent=2)

        families = db.query(Family).all()
        families_data = [{"id": fam.id, "gedcom_id": fam.gedcom_id, "spouse1_id": fam.spouse1_id, "spouse2_id": fam.spouse2_id} for fam in families]
        files_to_commit["data/families.json"] = json.dumps(families_data, indent=2)

        events = db.query(Event).all()
        events_data = [{"id": evt.id, "event_type": evt.event_type, "event_date": evt.event_date.isoformat() if evt.event_date else None, "place": evt.place, "description": evt.description} for evt in events]
        files_to_commit["data/events.json"] = json.dumps(events_data, indent=2)

        media_list = db.query(Media).all()
        media_data = [{"id": m.id, "filename": m.filename, "file_path": m.file_path, "media_type": m.media_type, "file_size": m.file_size, "media_date": m.media_date.isoformat() if m.media_date else None, "description": m.description, "extracted_text": m.extracted_text} for m in media_list]
        files_to_commit["data/media.json"] = json.dumps(media_data, indent=2)

        # Export places (geocoded locations)
        places = db.query(Place).all()
        places_data = [{"id": p.id, "name": p.name, "latitude": p.latitude, "longitude": p.longitude, "geocoded": p.geocoded} for p in places]
        files_to_commit["data/places.json"] = json.dumps(places_data, indent=2)

        # Export relationships
        relationships = {
            "individual_events": [],
            "family_events": [],
            "child_in_family": [],
            "media_individuals": [],
            "media_events": []
        }
        for ind in individuals:
            for evt in ind.events:
                relationships["individual_events"].append({"individual_id": ind.id, "event_id": evt.id})
        for fam in families:
            for evt in fam.events:
                relationships["family_events"].append({"family_id": fam.id, "event_id": evt.id})
        for fam in families:
            for child in fam.children:
                relationships["child_in_family"].append({"child_id": child.id, "family_id": fam.id})
        for m in media_list:
            for ind in m.individuals:
                relationships["media_individuals"].append({"media_id": m.id, "individual_id": ind.id})
        for m in media_list:
            for evt in m.events:
                relationships["media_events"].append({"media_id": m.id, "event_id": evt.id})
        files_to_commit["data/relationships.json"] = json.dumps(relationships, indent=2)

        manifest = {
            "export_date": datetime.now().isoformat(),
            "version": "1.0",
            "counts": {
                "individuals": len(individuals_data),
                "families": len(families_data),
                "events": len(events_data),
                "media": len(media_data),
                "places": len(places_data)
            }
        }
        files_to_commit["manifest.json"] = json.dumps(manifest, indent=2)

        # Get current commit SHA for the branch
        ref_response = requests.get(f"{github_api}/repos/{config.repo}/git/ref/heads/{config.branch}", headers=headers)

        if ref_response.status_code == 404:
            repo_info = repo_response.json()
            default_branch = repo_info.get("default_branch", "main")
            ref_response = requests.get(f"{github_api}/repos/{config.repo}/git/ref/heads/{default_branch}", headers=headers)
            if ref_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Could not find repository branch")

        current_commit_sha = ref_response.json()["object"]["sha"]

        commit_response = requests.get(f"{github_api}/repos/{config.repo}/git/commits/{current_commit_sha}", headers=headers)
        base_tree_sha = commit_response.json()["tree"]["sha"]

        # Create blobs for all files
        tree_items = []

        for file_path, content in files_to_commit.items():
            blob_response = requests.post(
                f"{github_api}/repos/{config.repo}/git/blobs",
                headers=headers,
                json={"content": content, "encoding": "utf-8"}
            )
            if blob_response.status_code != 201:
                raise HTTPException(status_code=500, detail=f"Failed to create blob for {file_path}")

            tree_items.append({
                "path": file_path,
                "mode": "100644",
                "type": "blob",
                "sha": blob_response.json()["sha"]
            })

        # Create blobs for media files
        media_files_exported = 0
        for m in media_list:
            try:
                response = minio_client.get_object("media", m.file_path)
                file_data = response.read()

                blob_response = requests.post(
                    f"{github_api}/repos/{config.repo}/git/blobs",
                    headers=headers,
                    json={"content": base64.b64encode(file_data).decode('utf-8'), "encoding": "base64"}
                )
                if blob_response.status_code == 201:
                    tree_items.append({
                        "path": f"media/{m.file_path}",
                        "mode": "100644",
                        "type": "blob",
                        "sha": blob_response.json()["sha"]
                    })
                    media_files_exported += 1
            except Exception as e:
                print(f"Warning: Could not export media file {m.file_path}: {e}")

        # Create new tree
        tree_response = requests.post(
            f"{github_api}/repos/{config.repo}/git/trees",
            headers=headers,
            json={"base_tree": base_tree_sha, "tree": tree_items}
        )
        if tree_response.status_code != 201:
            raise HTTPException(status_code=500, detail=f"Failed to create tree: {tree_response.text}")

        new_tree_sha = tree_response.json()["sha"]

        # Create commit
        commit_response = requests.post(
            f"{github_api}/repos/{config.repo}/git/commits",
            headers=headers,
            json={
                "message": config.commit_message,
                "tree": new_tree_sha,
                "parents": [current_commit_sha]
            }
        )
        if commit_response.status_code != 201:
            raise HTTPException(status_code=500, detail=f"Failed to create commit: {commit_response.text}")

        new_commit_sha = commit_response.json()["sha"]

        # Update branch reference
        ref_update_response = requests.patch(
            f"{github_api}/repos/{config.repo}/git/refs/heads/{config.branch}",
            headers=headers,
            json={"sha": new_commit_sha}
        )
        if ref_update_response.status_code != 200:
            ref_create_response = requests.post(
                f"{github_api}/repos/{config.repo}/git/refs",
                headers=headers,
                json={"ref": f"refs/heads/{config.branch}", "sha": new_commit_sha}
            )
            if ref_create_response.status_code != 201:
                raise HTTPException(status_code=500, detail=f"Failed to update branch: {ref_update_response.text}")

        return {
            "message": "Backup exported to GitHub successfully",
            "commit_sha": new_commit_sha,
            "branch": config.branch,
            "exported": {
                "individuals": len(individuals_data),
                "families": len(families_data),
                "events": len(events_data),
                "media": len(media_data),
                "media_files": media_files_exported,
                "places": len(places_data)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error exporting to GitHub: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error exporting to GitHub: {str(e)}")


@router.post("/github/import")
async def import_from_github(config: GitHubBackupRequest, db: Session = Depends(get_db)):
    """Import all data from a GitHub repository."""
    try:
        github_api = "https://api.github.com"
        headers = {
            "Authorization": f"token {config.token}",
            "Accept": "application/vnd.github.v3+json"
        }

        def get_file_content(path, is_binary=False):
            response = requests.get(
                f"{github_api}/repos/{config.repo}/contents/{path}?ref={config.branch}",
                headers=headers
            )
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail=f"File not found: {path}")

            content = response.json()["content"]
            if is_binary:
                return base64.b64decode(content)
            return base64.b64decode(content).decode('utf-8')

        try:
            manifest = json.loads(get_file_content("manifest.json"))
            print(f"Importing backup from {manifest.get('export_date', 'unknown date')}")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid backup: missing manifest.json")

        # Clear existing data
        db.execute(media_event.delete())
        db.execute(media_individual.delete())
        db.execute(individual_event.delete())
        db.execute(family_event.delete())
        db.execute(child_in_family.delete())
        db.query(Media).delete()
        db.query(Event).delete()
        db.query(Family).delete()
        db.query(Individual).delete()
        db.query(Place).delete()
        db.commit()

        # Import individuals
        individuals_json = json.loads(get_file_content("data/individuals.json"))
        id_map_individuals = {}
        for ind_data in individuals_json:
            old_id = ind_data.pop("id")
            ind = Individual(**ind_data)
            db.add(ind)
            db.flush()
            id_map_individuals[old_id] = ind.id

        # Import families
        families_json = json.loads(get_file_content("data/families.json"))
        id_map_families = {}
        for fam_data in families_json:
            old_id = fam_data.pop("id")
            if fam_data.get("spouse1_id"):
                fam_data["spouse1_id"] = id_map_individuals.get(fam_data["spouse1_id"])
            if fam_data.get("spouse2_id"):
                fam_data["spouse2_id"] = id_map_individuals.get(fam_data["spouse2_id"])
            fam = Family(**fam_data)
            db.add(fam)
            db.flush()
            id_map_families[old_id] = fam.id

        # Import events
        events_json = json.loads(get_file_content("data/events.json"))
        id_map_events = {}
        for evt_data in events_json:
            old_id = evt_data.pop("id")
            if evt_data.get("event_date"):
                evt_data["event_date"] = datetime.fromisoformat(evt_data["event_date"]).date()
            evt = Event(**evt_data)
            db.add(evt)
            db.flush()
            id_map_events[old_id] = evt.id

        # Import media metadata
        media_json = json.loads(get_file_content("data/media.json"))
        id_map_media = {}
        for m_data in media_json:
            old_id = m_data.pop("id")
            if m_data.get("media_date"):
                m_data["media_date"] = datetime.fromisoformat(m_data["media_date"]).date()
            m = Media(**m_data)
            db.add(m)
            db.flush()
            id_map_media[old_id] = m.id

        # Import places (geocoded locations)
        places_json = []
        try:
            places_json = json.loads(get_file_content("data/places.json"))
            for p_data in places_json:
                p_data.pop("id", None)  # Remove old id
                place = Place(**p_data)
                db.add(place)
        except HTTPException:
            # places.json may not exist in older backups
            print("Note: places.json not found in GitHub backup, skipping places import")

        # Import relationships
        relationships = json.loads(get_file_content("data/relationships.json"))

        for rel in relationships.get("individual_events", []):
            new_ind_id = id_map_individuals.get(rel["individual_id"])
            new_evt_id = id_map_events.get(rel["event_id"])
            if new_ind_id and new_evt_id:
                db.execute(individual_event.insert().values(individual_id=new_ind_id, event_id=new_evt_id))

        for rel in relationships.get("family_events", []):
            new_fam_id = id_map_families.get(rel["family_id"])
            new_evt_id = id_map_events.get(rel["event_id"])
            if new_fam_id and new_evt_id:
                db.execute(family_event.insert().values(family_id=new_fam_id, event_id=new_evt_id))

        for rel in relationships.get("child_in_family", []):
            new_child_id = id_map_individuals.get(rel["child_id"])
            new_fam_id = id_map_families.get(rel["family_id"])
            if new_child_id and new_fam_id:
                db.execute(child_in_family.insert().values(child_id=new_child_id, family_id=new_fam_id))

        for rel in relationships.get("media_individuals", []):
            new_media_id = id_map_media.get(rel["media_id"])
            new_ind_id = id_map_individuals.get(rel["individual_id"])
            if new_media_id and new_ind_id:
                db.execute(media_individual.insert().values(media_id=new_media_id, individual_id=new_ind_id))

        for rel in relationships.get("media_events", []):
            new_media_id = id_map_media.get(rel["media_id"])
            new_evt_id = id_map_events.get(rel["event_id"])
            if new_media_id and new_evt_id:
                db.execute(media_event.insert().values(media_id=new_media_id, event_id=new_evt_id))

        db.commit()

        # Import media files from GitHub to MinIO
        media_files_imported = 0
        for m_data in media_json:
            file_path = m_data["file_path"]
            try:
                media_content = get_file_content(f"media/{file_path}", is_binary=True)
                minio_client.put_object(
                    "media",
                    file_path,
                    io.BytesIO(media_content),
                    len(media_content)
                )
                media_files_imported += 1
            except Exception as e:
                print(f"Warning: Could not import media file {file_path}: {e}")

        return {
            "message": "Backup imported from GitHub successfully",
            "imported": {
                "individuals": len(individuals_json),
                "families": len(families_json),
                "events": len(events_json),
                "media": len(media_json),
                "media_files": media_files_imported,
                "places": len(places_json)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error importing from GitHub: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error importing from GitHub: {str(e)}")
