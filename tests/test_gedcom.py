"""Tests for GEDCOM export functionality.

These tests should run after test_api.py to ensure there's data in the database.
"""

import os
import tempfile
import requests
from gedcom.parser import Parser
from gedcom.element.individual import IndividualElement
from gedcom.element.family import FamilyElement


BASE_URL = "http://localhost:8001/api"


def test_export_gedcom_endpoint():
    """Test that the GEDCOM export endpoint returns a valid response."""
    response = requests.get(f"{BASE_URL}/export-gedcom")
    assert response.status_code == 200
    assert "application/x-gedcom" in response.headers.get("content-type", "")
    assert "attachment" in response.headers.get("content-disposition", "")
    assert ".ged" in response.headers.get("content-disposition", "")


def test_exported_gedcom_is_valid():
    """Test that the exported GEDCOM can be parsed by a GEDCOM library."""
    # Get the exported GEDCOM
    response = requests.get(f"{BASE_URL}/export-gedcom")
    assert response.status_code == 200

    gedcom_content = response.text

    # Verify it's not empty
    assert len(gedcom_content) > 0, "GEDCOM export is empty"

    # Write to a temp file and parse with python-gedcom
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".ged", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(gedcom_content)
        tmp_path = tmp.name

    try:
        parser = Parser()
        parser.parse_file(tmp_path, strict=False)

        # Get parsed elements
        root_elements = parser.get_root_child_elements()
        assert len(root_elements) > 0, "No elements parsed from GEDCOM"
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def test_exported_gedcom_has_header():
    """Test that the exported GEDCOM has a proper header."""
    response = requests.get(f"{BASE_URL}/export-gedcom")
    assert response.status_code == 200

    gedcom_content = response.text
    lines = gedcom_content.split("\n")

    # Check for required GEDCOM header elements
    assert lines[0] == "0 HEAD", "GEDCOM must start with header"

    # Check for GEDCOM version
    assert any(
        "GEDC" in line for line in lines
    ), "GEDCOM header must include GEDC tag"
    assert any(
        "5.5" in line for line in lines
    ), "GEDCOM version should be 5.5.x"

    # Check for character encoding
    assert any(
        "CHAR" in line for line in lines
    ), "GEDCOM header must include character encoding"

    # Check for trailer
    assert lines[-1] == "0 TRLR", "GEDCOM must end with trailer"


def test_exported_gedcom_contains_individuals():
    """Test that the exported GEDCOM contains individuals."""
    response = requests.get(f"{BASE_URL}/export-gedcom")
    assert response.status_code == 200

    gedcom_content = response.text

    # Write to a temp file and parse
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".ged", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(gedcom_content)
        tmp_path = tmp.name

    try:
        parser = Parser()
        parser.parse_file(tmp_path, strict=False)

        root_elements = parser.get_root_child_elements()
        individuals = [e for e in root_elements if isinstance(e, IndividualElement)]

        # There should be individuals (from test_api.py creating Simpsons)
        assert len(individuals) > 0, "No individuals found in exported GEDCOM"

        # Verify individuals have names
        for ind in individuals:
            name = ind.get_name()
            assert name is not None, "Individual should have a name"
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def test_exported_gedcom_contains_families():
    """Test that the exported GEDCOM contains families."""
    response = requests.get(f"{BASE_URL}/export-gedcom")
    assert response.status_code == 200

    gedcom_content = response.text

    # Write to a temp file and parse
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".ged", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(gedcom_content)
        tmp_path = tmp.name

    try:
        parser = Parser()
        parser.parse_file(tmp_path, strict=False)

        root_elements = parser.get_root_child_elements()
        families = [e for e in root_elements if isinstance(e, FamilyElement)]

        # There should be families (from test_api.py creating Simpson family)
        assert len(families) > 0, "No families found in exported GEDCOM"
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def test_exported_gedcom_data_matches_api():
    """Test that the exported GEDCOM data matches the API data."""
    # Get people count from API
    people_response = requests.get(f"{BASE_URL}/people")
    assert people_response.status_code == 200
    api_people = people_response.json()

    # Get families count from API
    families_response = requests.get(f"{BASE_URL}/families")
    assert families_response.status_code == 200
    api_families = families_response.json()

    # Export GEDCOM
    response = requests.get(f"{BASE_URL}/export-gedcom")
    assert response.status_code == 200

    gedcom_content = response.text

    # Parse GEDCOM
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".ged", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(gedcom_content)
        tmp_path = tmp.name

    try:
        parser = Parser()
        parser.parse_file(tmp_path, strict=False)

        root_elements = parser.get_root_child_elements()
        gedcom_individuals = [
            e for e in root_elements if isinstance(e, IndividualElement)
        ]
        gedcom_families = [e for e in root_elements if isinstance(e, FamilyElement)]

        # Counts should match
        assert len(gedcom_individuals) == len(api_people), (
            f"Individual count mismatch: GEDCOM has {len(gedcom_individuals)}, "
            f"API has {len(api_people)}"
        )
        assert len(gedcom_families) == len(api_families), (
            f"Family count mismatch: GEDCOM has {len(gedcom_families)}, "
            f"API has {len(api_families)}"
        )
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def test_gedcom_roundtrip():
    """Test that exported GEDCOM can be re-imported (basic validation)."""
    # Export GEDCOM
    response = requests.get(f"{BASE_URL}/export-gedcom")
    assert response.status_code == 200

    gedcom_content = response.text

    # Parse it - this validates the structure is correct
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".ged", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(gedcom_content)
        tmp_path = tmp.name

    try:
        parser = Parser()
        # Use strict=False to be lenient but still verify it parses
        parser.parse_file(tmp_path, strict=False)

        root_elements = parser.get_root_child_elements()

        # Verify we can access individual data
        individuals = [e for e in root_elements if isinstance(e, IndividualElement)]
        for ind in individuals:
            # Should be able to get pointer (ID)
            pointer = ind.get_pointer()
            assert pointer is not None
            assert pointer.startswith("@")
            assert pointer.endswith("@")

            # Should be able to get name
            name = ind.get_name()
            assert name is not None

        # Verify we can access family data
        families = [e for e in root_elements if isinstance(e, FamilyElement)]
        for fam in families:
            # Should be able to get pointer (ID)
            pointer = fam.get_pointer()
            assert pointer is not None
            assert pointer.startswith("@")
            assert pointer.endswith("@")

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
