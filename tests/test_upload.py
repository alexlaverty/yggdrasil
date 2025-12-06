import requests
import pytest

def test_upload_gedcom():
    """Test that GEDCOM file can be uploaded successfully"""
    with open('data/family-tree.ged', 'rb') as f:
        response = requests.post('http://localhost:8001/api/upload', files={'file': f})
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "GEDCOM uploaded and parsed successfully"

def test_people_retrieved():
    """Test that people are stored in the database"""
    response = requests.get('http://localhost:8001/api/people')
    assert response.status_code == 200
    people = response.json()
    assert len(people) > 0, "No people found in database"

def test_births_retrieved():
    """Test that birth events are stored in the database"""
    response = requests.get('http://localhost:8001/api/births')
    assert response.status_code == 200
    births = response.json()
    assert len(births) > 0, "No birth events found in database"
    # Verify birth event has required fields
    for birth in births:
        assert 'id' in birth
        assert 'individual' in birth
        assert 'date' in birth
        assert 'place' in birth

def test_deaths_retrieved():
    """Test that death events are stored in the database"""
    response = requests.get('http://localhost:8001/api/deaths')
    assert response.status_code == 200
    deaths = response.json()
    assert len(deaths) > 0, "No death events found in database"
    # Verify death event has required fields
    for death in deaths:
        assert 'id' in death
        assert 'individual' in death
        assert 'date' in death
        assert 'place' in death

def test_marriages_retrieved():
    """Test that marriage events are stored in the database"""
    response = requests.get('http://localhost:8001/api/marriages')
    assert response.status_code == 200
    marriages = response.json()
    assert len(marriages) > 0, "No marriage events found in database"
    # Verify marriage event has required fields
    for marriage in marriages:
        assert 'id' in marriage
        assert 'family' in marriage
        assert 'date' in marriage
        assert 'place' in marriage