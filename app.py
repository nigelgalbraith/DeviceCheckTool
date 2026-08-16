from __future__ import annotations

import json
import math
import os
import re
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).parent
PUBLIC_DIR = BASE_DIR / "public"
EDITOR_DIR = BASE_DIR / "editor"
DATA_DIR = PUBLIC_DIR / "data"
BACKUP_DIR = BASE_DIR / "backups"
DEVICE_TYPE_REGISTRY_PATH = DATA_DIR / "deviceTypes.json"
CHECKUP_DIR = DATA_DIR / "checkups"
SAFE_DEVICE_ID_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_-]*$")
SUPPORTED_CHECK_TYPES = {"percentage", "number", "yes_no", "pass_fail", "condition", "text"}

app = Flask(__name__, static_folder=None)


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def backup_path_for(path: Path) -> Path:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    resolved_parent = path.parent.resolve()
    checkup_root = CHECKUP_DIR.resolve()
    if resolved_parent == checkup_root or resolved_parent.is_relative_to(checkup_root):
        backup_dir = BACKUP_DIR / "checkups" / path.parent.relative_to(CHECKUP_DIR)
    else:
        backup_dir = BACKUP_DIR
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / f"{path.stem}.{timestamp}.bak"
    suffix = 1
    while backup_path.exists():
        backup_path = backup_dir / f"{path.stem}.{timestamp}.{suffix}.bak"
        suffix += 1
    return backup_path


def atomic_write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    if path.exists():
        shutil.copy2(path, backup_path_for(path))
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent)
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(value, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, path)
    except Exception:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise


def is_object(value: Any) -> bool:
    return isinstance(value, dict)


def require(errors: list[str], condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


def validate_score(errors: list[str], value: Any, path: str) -> None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        errors.append(f"{path} must be a number.")
        return
    require(errors, 1 <= number <= 5, f"{path} must be between 1 and 5.")


def validate_rule_score(errors: list[str], value: Any, path: str) -> None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        errors.append(f"{path} must be a number.")
        return
    require(errors, 0 <= number <= 100, f"{path} must be between 0 and 100.")


def validate_text_list(errors: list[str], value: Any, path: str) -> None:
    require(errors, isinstance(value, list), f"{path} must be a list.")
    if not isinstance(value, list):
        return
    for index, item in enumerate(value):
        require(errors, isinstance(item, str), f"{path}[{index}] must be text.")


def validate_optional_text(errors: list[str], value: Any, path: str) -> None:
    if value is not None:
        require(errors, isinstance(value, str), f"{path} must be text.")


def validate_rule_result(errors: list[str], value: Any, path: str) -> None:
    require(errors, is_object(value), f"{path} must be an object.")
    if not is_object(value):
        return
    require(errors, "score" in value, f"{path}.score is required.")
    if "score" in value:
        validate_rule_score(errors, value.get("score"), f"{path}.score")
    validate_optional_text(errors, value.get("issue"), f"{path}.issue")
    validate_optional_text(errors, value.get("recommendation"), f"{path}.recommendation")


def validate_rules(errors: list[str], rules: Any, check_type: str, path: str) -> None:
    if rules is None:
        return
    if check_type in {"percentage", "number"}:
        require(errors, isinstance(rules, list), f"{path}.rules must be a list for {check_type} checks.")
        if not isinstance(rules, list):
            return
        for index, rule in enumerate(rules):
            rule_path = f"{path}.rules[{index}]"
            require(errors, is_object(rule), f"{rule_path} must be an object.")
            if not is_object(rule):
                continue
            if "min" in rule:
                require(errors, isinstance(rule.get("min"), (int, float)), f"{rule_path}.min must be a number.")
            if "max" in rule:
                require(errors, isinstance(rule.get("max"), (int, float)), f"{rule_path}.max must be a number.")
            if isinstance(rule.get("min"), (int, float)) and isinstance(rule.get("max"), (int, float)):
                require(errors, rule["min"] <= rule["max"], f"{rule_path}.min must be less than or equal to max.")
            require(errors, "score" in rule, f"{rule_path}.score is required.")
            if "score" in rule:
                validate_rule_score(errors, rule.get("score"), f"{rule_path}.score")
            validate_optional_text(errors, rule.get("issue"), f"{rule_path}.issue")
            validate_optional_text(errors, rule.get("recommendation"), f"{rule_path}.recommendation")
        return
    if check_type in {"yes_no", "pass_fail", "condition", "text"}:
        require(errors, is_object(rules), f"{path}.rules must be an object for {check_type} checks.")
        if not is_object(rules):
            return
        for key, rule in rules.items():
            require(errors, isinstance(key, str) and key.strip(), f"{path}.rules keys must be text.")
            validate_rule_result(errors, rule, f"{path}.rules.{key}")
        return
    require(errors, check_type == "text", f"{path}.rules is not supported for unknown check type.")


def validate_check(errors: list[str], check: Any, path: str) -> None:
    require(errors, is_object(check), f"{path} must be an object.")
    if not is_object(check):
        return
    check_id = check.get("id")
    require(errors, isinstance(check_id, str) and check_id.strip(), f"{path}.id is required.")
    if isinstance(check_id, str):
        require(errors, bool(SAFE_DEVICE_ID_PATTERN.fullmatch(check_id)), f"{path}.id may contain only letters, numbers, underscores, or hyphens and must start with a letter.")
    require(errors, isinstance(check.get("label"), str) and check["label"].strip(), f"{path}.label is required.")
    check_type = check.get("type")
    require(errors, check_type in SUPPORTED_CHECK_TYPES, f"{path}.type must be one of {', '.join(sorted(SUPPORTED_CHECK_TYPES))}.")
    if "unit" in check:
        require(errors, isinstance(check.get("unit"), str), f"{path}.unit must be text.")
    if "allowNA" in check:
        require(errors, isinstance(check.get("allowNA"), bool), f"{path}.allowNA must be true or false.")
    if "weight" in check:
        require(errors, isinstance(check.get("weight"), (int, float)), f"{path}.weight must be a number.")
    if isinstance(check_type, str):
        validate_rules(errors, check.get("rules"), check_type, path)


def validate_device_check_definition(data: Any, device_id: str) -> list[str]:
    errors: list[str] = []
    require(errors, is_object(data), f"checkups.{device_id} must be an object.")
    if not is_object(data):
        return errors
    definition_id = data.get("id")
    require(errors, isinstance(definition_id, str) and definition_id.strip(), f"checkups.{device_id}.id is required.")
    if isinstance(definition_id, str):
        require(errors, bool(SAFE_DEVICE_ID_PATTERN.fullmatch(definition_id)), f"checkups.{device_id}.id may contain only letters, numbers, underscores, or hyphens and must start with a letter.")
    require(errors, isinstance(data.get("title"), str) and data["title"].strip(), f"checkups.{device_id}.title is required.")
    require(errors, isinstance(data.get("description"), str), f"checkups.{device_id}.description must be text.")
    categories = data.get("categories")
    require(errors, isinstance(categories, list), f"checkups.{device_id}.categories must be a list.")
    if not isinstance(categories, list):
        return errors
    seen_categories: set[str] = set()
    for category_index, category in enumerate(categories):
        category_path = f"checkups.{device_id}.categories[{category_index}]"
        require(errors, is_object(category), f"{category_path} must be an object.")
        if not is_object(category):
            continue
        category_id = category.get("id")
        require(errors, isinstance(category_id, str) and category_id.strip(), f"{category_path}.id is required.")
        if isinstance(category_id, str):
            require(errors, bool(SAFE_DEVICE_ID_PATTERN.fullmatch(category_id)), f"{category_path}.id may contain only letters, numbers, underscores, or hyphens and must start with a letter.")
            if category_id in seen_categories:
                errors.append(f"checkups.{device_id}.categories contains duplicate id {category_id}.")
            seen_categories.add(category_id)
        require(errors, isinstance(category.get("title"), str) and category["title"].strip(), f"{category_path}.title is required.")
        checks = category.get("checks")
        require(errors, isinstance(checks, list), f"{category_path}.checks must be a list.")
        if not isinstance(checks, list):
            continue
        seen_checks: set[str] = set()
        for check_index, check in enumerate(checks):
            check_path = f"{category_path}.checks[{check_index}]"
            validate_check(errors, check, check_path)
            if is_object(check) and isinstance(check.get("id"), str):
                check_id = check["id"].strip()
                if check_id in seen_checks:
                    errors.append(f"{category_path}.checks contains duplicate id {check_id}.")
                seen_checks.add(check_id)
    return errors


def validate_scoring_config(data: Any) -> list[str]:
    errors: list[str] = []
    require(errors, isinstance(data, list), "scoring must be a list.")
    if not isinstance(data, list):
        return errors
    for index, band in enumerate(data):
        path = f"scoring[{index}]"
        require(errors, is_object(band), f"{path} must be an object.")
        if not is_object(band):
            continue
        min_value = band.get("minScore")
        max_value = band.get("maxScore")
        require(errors, isinstance(band.get("color"), str) and band["color"].strip(), f"{path}.color is required.")
        require(errors, isinstance(min_value, (int, float)) and math.isfinite(float(min_value)), f"{path}.minScore must be a number.")
        require(errors, isinstance(max_value, (int, float)) and math.isfinite(float(max_value)), f"{path}.maxScore must be a number.")
        if isinstance(min_value, (int, float)) and isinstance(max_value, (int, float)):
            require(errors, min_value <= max_value, f"{path}.minScore must be less than or equal to maxScore.")
            require(errors, 0 <= min_value and max_value <= 100, f"{path} must be within 0-100.")
        require(errors, isinstance(band.get("message"), str) and band["message"].strip(), f"{path}.message is required.")
        require(errors, isinstance(band.get("title"), str) and band["title"].strip(), f"{path}.title is required.")
    return errors


def validate_risk_id(value: Any, label: str = "Device Checkup ID") -> list[str]:
    risk_id = str(value or "").strip()
    errors: list[str] = []
    require(errors, bool(risk_id), f"{label} is required.")
    require(errors, bool(SAFE_DEVICE_ID_PATTERN.fullmatch(risk_id)), f"{label} may contain only letters, numbers, underscores, or hyphens and must start with a letter.")
    return errors


def device_check_key(category_id: str, device_id: str) -> str:
    return f"{category_id}-{device_id}"


def validate_intro_list(errors: list[str], value: Any, path: str) -> None:
    require(errors, isinstance(value, list), f"{path} must be a list.")
    if not isinstance(value, list):
        return
    for index, item in enumerate(value):
        require(errors, isinstance(item, str), f"{path}[{index}] must be text.")


def validate_risk_registry(data: Any) -> list[str]:
    errors: list[str] = []
    require(errors, is_object(data), "deviceTypes must be an object.")
    if not is_object(data):
        return errors
    home = data.get("home")
    require(errors, is_object(home), "deviceTypes.home must be an object.")
    if is_object(home):
        require(errors, isinstance(home.get("title"), str) and home["title"].strip(), "deviceTypes.home.title is required.")
        validate_intro_list(errors, home.get("intro"), "deviceTypes.home.intro")
    categories = data.get("categories")
    require(errors, isinstance(categories, list), "deviceTypes.categories must be a list.")
    if not isinstance(categories, list):
        return errors
    seen_categories: set[str] = set()
    for category_index, category in enumerate(categories):
        category_path = f"deviceTypes.categories[{category_index}]"
        require(errors, is_object(category), f"{category_path} must be an object.")
        if not is_object(category):
            continue
        category_id = category.get("id")
        require(errors, isinstance(category_id, str) and category_id.strip(), f"{category_path}.id is required.")
        if not isinstance(category_id, str):
            continue
        require(errors, bool(SAFE_DEVICE_ID_PATTERN.fullmatch(category_id)), f"{category_path}.id may contain only letters, numbers, underscores, or hyphens and must start with a letter.")
        if category_id in seen_categories:
            errors.append(f"deviceTypes.categories contains duplicate id {category_id}.")
        seen_categories.add(category_id)
        require(errors, isinstance(category.get("title"), str) and category["title"].strip(), f"{category_path}.title is required.")
        require(errors, isinstance(category.get("description"), str), f"{category_path}.description must be text.")
        validate_intro_list(errors, category.get("intro"), f"{category_path}.intro")
        devices = category.get("devices")
        require(errors, isinstance(devices, list), f"{category_path}.devices must be a list.")
        if not isinstance(devices, list):
            continue
        seen_devices: set[str] = set()
        for device_index, device in enumerate(devices):
            device_path = f"{category_path}.devices[{device_index}]"
            require(errors, is_object(device), f"{device_path} must be an object.")
            if not is_object(device):
                continue
            device_id = device.get("id")
            require(errors, isinstance(device_id, str) and device_id.strip(), f"{device_path}.id is required.")
            if not isinstance(device_id, str):
                continue
            require(errors, bool(SAFE_DEVICE_ID_PATTERN.fullmatch(device_id)), f"{device_path}.id may contain only letters, numbers, underscores, or hyphens and must start with a letter.")
            if device_id in seen_devices:
                errors.append(f"{category_path}.devices contains duplicate id {device_id}.")
            seen_devices.add(device_id)
            expected_path = f"checkups/{category_id}/{device_id}.json"
            require(errors, device.get("path") == expected_path, f"{device_path}.path must reference {expected_path}.")
            require(errors, risk_table_path(category_id, device_id).is_file(), f"{expected_path} is missing.")
    return errors


def validate_risk_analysis_rows(data: Any, risk_id: str) -> list[str]:
    return validate_device_check_definition(data, risk_id)


def risk_table_path(category_id: str, device_id: str) -> Path:
    if not SAFE_DEVICE_ID_PATTERN.fullmatch(category_id):
        raise ValueError("Invalid platform ID.")
    if not SAFE_DEVICE_ID_PATTERN.fullmatch(device_id):
        raise ValueError("Invalid manufacturer ID.")
    path = (CHECKUP_DIR / category_id / f"{device_id}.json").resolve()
    root = CHECKUP_DIR.resolve()
    if not path.is_relative_to(root):
        raise ValueError("Invalid Device Check path.")
    return path


def load_risk_registry() -> dict[str, Any]:
    return read_json(DEVICE_TYPE_REGISTRY_PATH)


def device_title(value: str) -> str:
    labels = {"hp": "HP", "asus": "ASUS", "macos": "macOS", "ios": "iPhone"}
    if value in labels:
        return labels[value]
    return re.sub(r"[-_]+", " ", value).title()


def find_category_entry(registry: dict[str, Any], category_id: str) -> dict[str, Any] | None:
    categories = registry.get("categories") if is_object(registry) else []
    if not isinstance(categories, list):
        return None
    for category in categories:
        if is_object(category) and category.get("id") == category_id:
            return category
    return None


def find_risk_analysis_entry(registry: dict[str, Any], risk_id: str) -> dict[str, Any] | None:
    categories = registry.get("categories") if is_object(registry) else []
    if not isinstance(categories, list):
        return None
    for category in categories:
        if not is_object(category):
            continue
        category_id = str(category.get("id") or "").strip()
        for device in category.get("devices") or []:
            if not is_object(device):
                continue
            device_id = str(device.get("id") or "").strip()
            if risk_id == device_check_key(category_id, device_id):
                manufacturer_title = device_title(device_id)
                category_title = str(category.get("title") or device_title(category_id))
                return {
                    **device,
                    "id": risk_id,
                    "categoryId": category_id,
                    "deviceId": device_id,
                    "manufacturerId": device_id,
                    "manufacturerTitle": manufacturer_title,
                    "categoryTitle": category_title,
                    "title": f"{category_title} - {manufacturer_title}",
                }
    return None


def find_device_entry(registry: dict[str, Any], category_id: str, device_id: str) -> dict[str, Any] | None:
    return find_risk_analysis_entry(registry, device_check_key(category_id, device_id))


def validate_create_risk_payload(payload: Any, registry: dict[str, Any]) -> tuple[list[str], str, str, dict[str, Any]]:
    errors: list[str] = []
    if not is_object(payload):
        return ["Request body must be JSON."], "", "", {}
    category_id = str(payload.get("categoryId") or payload.get("platformId") or "").strip()
    device_id = str(payload.get("manufacturerId") or payload.get("deviceId") or "").strip()
    title = str(payload.get("title") or f"{device_title(device_id)} {device_title(category_id)} Device Check").strip()
    description = str(payload.get("description") or "")
    controls = payload.get("controls")
    definition = payload.get("definition")
    errors.extend(validate_risk_id(category_id, "Platform ID"))
    errors.extend(validate_risk_id(device_id, "Manufacturer ID"))
    category = find_category_entry(registry, category_id)
    if not category:
        errors.append(f"Unknown platform: {category_id}")
    elif find_device_entry(registry, category_id, device_id):
        errors.append(f'Device Check "{category_id}/{device_id}" already exists.')
    if not is_object(definition):
        definition = {
            "id": device_check_key(category_id, device_id),
            "title": title,
            "description": description,
            "categories": [
                {
                    "id": "system",
                    "title": "System",
                    "checks": controls if isinstance(controls, list) else []
                }
            ]
        }
    definition_errors = validate_device_check_definition(definition, device_check_key(category_id or "platform", device_id or "manufacturer"))
    errors.extend(definition_errors)
    return errors, category_id, device_id, definition if is_object(definition) else {}


def build_registry_entry(category_id: str, device_id: str) -> dict[str, str]:
    return {
        "id": device_id,
        "path": f"checkups/{category_id}/{device_id}.json",
    }


@app.get("/api/editor/device-types")
@app.get("/api/editor/risk-tables")
def get_device_types_registry():
    try:
        registry = load_risk_registry()
        errors = validate_risk_registry(registry)
        if errors:
            return jsonify({"errors": errors}), 500
        return jsonify(registry)
    except (OSError, json.JSONDecodeError) as error:
        return jsonify({"error": str(error)}), 500


@app.get("/api/editor/device-types/<category_id>/<device_id>")
def get_nested_checkup(category_id: str, device_id: str):
    errors = validate_risk_id(category_id, "Platform ID") + validate_risk_id(device_id, "Manufacturer ID")
    if errors:
        return jsonify({"errors": errors}), 400
    try:
        registry = load_risk_registry()
        if not find_device_entry(registry, category_id, device_id):
            return jsonify({"errors": [f"Unknown Device Check: {category_id}/{device_id}"]}), 404
        return jsonify(read_json(risk_table_path(category_id, device_id)))
    except ValueError as error:
        return jsonify({"errors": [str(error)]}), 400
    except FileNotFoundError:
        return jsonify({"errors": [f"Device Check file not found: {category_id}/{device_id}"]}), 404
    except (OSError, json.JSONDecodeError) as error:
        return jsonify({"error": str(error)}), 500


@app.get("/api/editor/device-types/<risk_id>")
@app.get("/api/editor/risk-tables/<risk_id>")
def get_checkup(risk_id: str):
    errors = validate_risk_id(risk_id)
    if errors:
        return jsonify({"errors": errors}), 400
    try:
        registry = load_risk_registry()
        entry = find_risk_analysis_entry(registry, risk_id)
        if not entry:
            return jsonify({"errors": [f"Unknown Device Checkup: {risk_id}"]}), 404
        return jsonify(read_json(risk_table_path(entry["categoryId"], entry["deviceId"])))
    except ValueError as error:
        return jsonify({"errors": [str(error)]}), 400
    except FileNotFoundError:
        return jsonify({"errors": [f"Device Checkup file not found: {risk_id}"]}), 404
    except (OSError, json.JSONDecodeError) as error:
        return jsonify({"error": str(error)}), 500


@app.post("/api/editor/device-types/<category_id>/<device_id>")
def save_nested_checkup(category_id: str, device_id: str):
    errors = validate_risk_id(category_id, "Platform ID") + validate_risk_id(device_id, "Manufacturer ID")
    if errors:
        return jsonify({"errors": errors}), 400
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or "data" not in payload:
        return jsonify({"errors": ["Request body must be JSON with a data field."]}), 400
    rows = payload["data"]
    row_errors = validate_risk_analysis_rows(rows, device_check_key(category_id, device_id))
    if row_errors:
        return jsonify({"errors": row_errors}), 400
    try:
        registry = load_risk_registry()
        if not find_device_entry(registry, category_id, device_id):
            return jsonify({"errors": [f"Unknown Device Check: {category_id}/{device_id}"]}), 404
        path = risk_table_path(category_id, device_id)
        atomic_write_json(path, rows)
        return jsonify({"ok": True, "serviceId": device_check_key(category_id, device_id), "path": path.relative_to(DATA_DIR).as_posix()})
    except ValueError as error:
        return jsonify({"errors": [str(error)]}), 400
    except (OSError, json.JSONDecodeError) as error:
        app.logger.exception("Could not save Device Check %s/%s", category_id, device_id)
        return jsonify({"errors": [f"Could not save Device Check {category_id}/{device_id}: {error}"]}), 500


@app.post("/api/editor/device-types/<risk_id>")
@app.post("/api/editor/risk-tables/<risk_id>")
def save_checkup(risk_id: str):
    errors = validate_risk_id(risk_id)
    if errors:
        return jsonify({"errors": errors}), 400
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or "data" not in payload:
        return jsonify({"errors": ["Request body must be JSON with a data field."]}), 400
    rows = payload["data"]
    row_errors = validate_risk_analysis_rows(rows, risk_id)
    if row_errors:
        return jsonify({"errors": row_errors}), 400
    try:
        registry = load_risk_registry()
        entry = find_risk_analysis_entry(registry, risk_id)
        if not entry:
            return jsonify({"errors": [f"Unknown Device Checkup: {risk_id}"]}), 404
        path = risk_table_path(entry["categoryId"], entry["deviceId"])
        atomic_write_json(path, rows)
        return jsonify({"ok": True, "serviceId": risk_id, "path": path.relative_to(DATA_DIR).as_posix()})
    except ValueError as error:
        return jsonify({"errors": [str(error)]}), 400
    except (OSError, json.JSONDecodeError) as error:
        app.logger.exception("Could not save Device Checkup %s", risk_id)
        return jsonify({"errors": [f"Could not save Device Checkup {risk_id}: {error}"]}), 500


@app.post("/api/editor/device-types")
@app.post("/api/editor/risk-tables")
def create_checkup():
    payload = request.get_json(silent=True)
    try:
        registry = load_risk_registry()
        errors = validate_risk_registry(registry)
        if errors:
            return jsonify({"errors": errors}), 500
        errors, category_id, device_id, definition = validate_create_risk_payload(payload, registry)
        if errors:
            return jsonify({"errors": errors}), 400
        path = risk_table_path(category_id, device_id)
        if path.exists():
            return jsonify({"errors": [f"Device Check file already exists: {category_id}/{device_id}"]}), 400
        category = find_category_entry(registry, category_id)
        if not category:
            return jsonify({"errors": [f"Unknown platform: {category_id}"]}), 400
        next_registry = {
            **registry,
            "categories": [
                {
                    **item,
                    "devices": [*(item.get("devices") or []), build_registry_entry(category_id, device_id)]
                } if is_object(item) and item.get("id") == category_id else item
                for item in registry.get("categories", [])
            ]
        }
        atomic_write_json(path, definition)
        registry_errors = validate_risk_registry(next_registry)
        if registry_errors:
            path.unlink()
            return jsonify({"errors": registry_errors}), 400
        try:
            atomic_write_json(DEVICE_TYPE_REGISTRY_PATH, next_registry)
        except Exception:
            try:
                path.unlink()
            except FileNotFoundError:
                pass
            raise
        return jsonify({"ok": True, "serviceId": device_check_key(category_id, device_id), "path": path.relative_to(DATA_DIR).as_posix()})
    except ValueError as error:
        return jsonify({"errors": [str(error)]}), 400
    except (OSError, json.JSONDecodeError) as error:
        app.logger.exception("Could not create Device Checkup")
        return jsonify({"errors": [f"Could not create Device Checkup: {error}"]}), 500


@app.get("/editor")
@app.get("/editor/")
def editor_index():
    return send_from_directory(EDITOR_DIR, "index.html")


@app.get("/editor/<path:filename>")
def editor_assets(filename: str):
    return send_from_directory(EDITOR_DIR, filename)


@app.get("/")
def public_index():
    return send_from_directory(PUBLIC_DIR, "index.html")


@app.get("/public")
@app.get("/public/")
def public_subdir_index():
    return send_from_directory(PUBLIC_DIR, "index.html")


@app.get("/public/<path:filename>")
def public_subdir_assets(filename: str):
    return send_from_directory(PUBLIC_DIR, filename)


@app.get("/<path:filename>")
def public_assets(filename: str):
    return send_from_directory(PUBLIC_DIR, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=False)
