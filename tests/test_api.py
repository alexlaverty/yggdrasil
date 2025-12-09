import requests
import pytest

BASE_URL = "http://localhost:8001/api"

# Simpsons family data
simpsons = {
    "homer": {
        "first_name": "Homer",
        "last_name": "Simpson",
        "sex": "M",
        "birth_date": "1956-05-12",
        "birth_place": "Springfield",
        "death_date": None,
        "death_place": None
    },
    "marge": {
        "first_name": "Marge",
        "last_name": "Simpson",
        "sex": "F",
        "birth_date": "1956-03-19",
        "birth_place": "Springfield",
        "death_date": None,
        "death_place": None
    },
    "bart": {
        "first_name": "Bart",
        "last_name": "Simpson",
        "sex": "M",
        "birth_date": "1980-04-01",
        "birth_place": "Springfield",
        "death_date": None,
        "death_place": None
    },
    "lisa": {
        "first_name": "Lisa",
        "last_name": "Simpson",
        "sex": "F",
        "birth_date": "1982-05-09",
        "birth_place": "Springfield",
        "death_date": None,
        "death_place": None
    },
    "maggie": {
        "first_name": "Maggie",
        "last_name": "Simpson",
        "sex": "F",
        "birth_date": "1988-01-12",
        "birth_place": "Springfield",
        "death_date": None,
        "death_place": None
    }
}


def find_person_by_name(first_name, last_name):
    """Find a person by first and last name, return their ID or None."""
    people = requests.get(f"{BASE_URL}/people").json()
    for person in people:
        if person["first_name"] == first_name and person["last_name"] == last_name:
            return person["id"]
    return None


def get_or_create_simpsons():
    """Get existing Simpsons or create them if they don't exist. Returns their IDs."""
    ids = {}
    for name, data in simpsons.items():
        # Check if person already exists
        person_id = find_person_by_name(data["first_name"], data["last_name"])
        if person_id:
            ids[name] = person_id
        else:
            resp = requests.post(f"{BASE_URL}/people", json=data)
            assert resp.status_code == 200
            ids[name] = resp.json()["id"]
    return ids


class TestSimpsonsFamily:
    """Test suite for Simpsons family API operations."""

    @pytest.fixture(scope="class")
    def simpsons_ids(self):
        """Create or get Simpsons family members once for the entire test class."""
        return get_or_create_simpsons()

    @pytest.fixture(scope="class")
    def family_setup(self, simpsons_ids):
        """Set up family relationships (parents for children) once."""
        # Add Homer and Marge as parents to Bart (creates family with marriage event)
        requests.post(
            f"{BASE_URL}/people/{simpsons_ids['bart']}/add-parent",
            json={"related_person_id": simpsons_ids["homer"]}
        )
        requests.post(
            f"{BASE_URL}/people/{simpsons_ids['bart']}/add-parent",
            json={"related_person_id": simpsons_ids["marge"]}
        )
        # Add same parents to Lisa and Maggie (should use existing family)
        for child in ["lisa", "maggie"]:
            requests.post(
                f"{BASE_URL}/people/{simpsons_ids[child]}/add-parent",
                json={"related_person_id": simpsons_ids["homer"]}
            )
            requests.post(
                f"{BASE_URL}/people/{simpsons_ids[child]}/add-parent",
                json={"related_person_id": simpsons_ids["marge"]}
            )
        return simpsons_ids

    def test_create_simpsons(self, simpsons_ids):
        """Test that Simpsons family members exist."""
        assert len(simpsons_ids) == 5
        assert all(isinstance(v, int) for v in simpsons_ids.values())

    def test_add_parents(self, family_setup):
        """Verify Homer and Marge are parents to Bart, Lisa, and Maggie."""
        ids = family_setup
        for child in ["bart", "lisa", "maggie"]:
            person = requests.get(f"{BASE_URL}/people/{ids[child]}").json()
            parent_ids = [p["id"] for p in person.get("parents", [])]
            assert ids["homer"] in parent_ids or ids["marge"] in parent_ids

    def test_add_family(self, family_setup):
        """Check that the Simpsons family exists and is linked correctly."""
        ids = family_setup
        fam_resp = requests.get(f"{BASE_URL}/families")
        assert fam_resp.status_code == 200
        families = fam_resp.json()
        # Homer and Marge should be spouses in at least one family
        assert any(
            (f["spouse1_id"] == ids["homer"] and f["spouse2_id"] == ids["marge"]) or
            (f["spouse1_id"] == ids["marge"] and f["spouse2_id"] == ids["homer"])
            for f in families
        )

    def test_add_marriage_event(self, family_setup):
        """Marriage event for Homer and Marge should exist."""
        marriages = requests.get(f"{BASE_URL}/marriages").json()
        assert any(
            "Homer Simpson" in m["family"] and "Marge Simpson" in m["family"]
            for m in marriages
        )

    def test_add_birth_event(self, simpsons_ids):
        """Birth events for Bart, Lisa, Maggie should exist."""
        births = requests.get(f"{BASE_URL}/births").json()
        for name in ["bart", "lisa", "maggie"]:
            assert any(simpsons[name]["first_name"] in b["individual"] for b in births)

    def test_add_death_event(self, simpsons_ids):
        """Add death event for Bart and check it exists."""
        ids = simpsons_ids
        # Update Bart with death info
        update = {"death_date": "2025-12-10", "death_place": "Springfield"}
        resp = requests.put(f"{BASE_URL}/people/{ids['bart']}", json=update)
        assert resp.status_code == 200
        deaths = requests.get(f"{BASE_URL}/deaths").json()
        assert any("Bart Simpson" in d["individual"] for d in deaths)

    def test_add_burial_event(self, simpsons_ids):
        """Add burial event for Bart and check it exists."""
        ids = simpsons_ids
        # Update Bart with burial info
        update = {"burial_date": "2025-12-15", "burial_place": "Springfield Cemetery"}
        resp = requests.put(f"{BASE_URL}/people/{ids['bart']}", json=update)
        assert resp.status_code == 200
        burials = requests.get(f"{BASE_URL}/burials").json()
        assert any("Bart Simpson" in b["individual"] for b in burials)
