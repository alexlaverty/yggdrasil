# GEDCOM Family Structure Explanation

## FAMC and FAMS Tags

In GEDCOM format:

- **FAMC** (Family as a Child) - Indicates the family where a person is a child
  - References a FAM record where the person is listed as a CHIL (child)
  - Example: `1 FAMC @F45@` means this person is a child in family F45

- **FAMS** (Family as a Spouse) - Indicates the family where a person is a spouse/parent
  - References a FAM record where the person is listed as a HUSB (husband) or WIFE (wife)
  - Example: `1 FAMS @F52@` means this person is a spouse in family F52

## Family Record Structure

A FAM (Family) record contains:

- **HUSB** (Husband) - Reference to the male spouse
- **WIFE** (Wife) - Reference to the female spouse
- **CHIL** (Child) - Reference to each child in the family
- **MARR** (Marriage) - Marriage event with DATE and PLAC

Example:
```
0 @F45@ FAM
1 HUSB @I282315998710@
1 WIFE @I282315998664@
1 CHIL @I282315998663@
1 CHIL @I282315998665@
1 MARR
2 DATE 15 SEP 1985
2 PLAC Auburn Hospital
```

## Implementation

The application now:

1. **Parses Family Records** - Extracts all FAM records from the GEDCOM file
2. **Stores Family Relationships** - Saves spouse1, spouse2, and children relationships in the database
3. **Provides Family List** - A dedicated "Families" page showing all families with spouse names and children count
4. **Links to People** - Family members are clickable links to their individual profiles
5. **Shows Marriage Events** - Marriage events are associated with Family records, not individuals

## Navigation

- Click "Families" in the sidebar to view all families
- Each family row shows both spouses and the number of children
- Click on a spouse name to view their individual profile
