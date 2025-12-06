"""Shared utility functions."""


def get_male_birth_year(family):
    """Get the birth year of the male spouse in a family.

    Used for sorting families and marriages by the husband's birth year.
    """
    male = None
    if family.spouse1 and family.spouse1.sex == 'M':
        male = family.spouse1
    elif family.spouse2 and family.spouse2.sex == 'M':
        male = family.spouse2

    if male:
        for event in male.events:
            if event.event_type == "BIRT" and event.event_date:
                return event.event_date.year
    return None
