## Modeling a Family Tree: An Optimal PostgreSQL Schema for GEDCOM Data

Storing genealogical information from a GEDCOM file in a structured and queryable format is essential for building robust family tree applications. A well-designed PostgreSQL schema can provide the flexibility and performance needed to manage the complexities of genealogical data, including individuals, families, events, and sources. This document outlines an optimal database schema for this purpose.

The proposed schema is normalized to reduce data redundancy and improve data integrity. It revolves around a central `individual` table, with related information stored in separate, linked tables for events, families, sources, and notes.

### Core Schema Components

The database schema is comprised of the following key tables:

*   **individual**: Stores information about each person.
*   **family**: Represents family units, linking spouses and their children.
*   **event**: A generic table to store various life events such as birth, death, and marriage.
*   **source**: Contains information about the sources of the genealogical data.
*   **note**: Stores additional notes and commentary related to individuals, families, or events.
*   **individual_event**: A linking table between individuals and their life events.
*   **family_event**: A linking table between families and events such as marriage.
*   **individual_source**: A linking table to associate sources with specific information about an individual.
*   **family_source**: A linking table to associate sources with family information.
*   **individual_note**: A linking table for notes pertaining to individuals.
*   **family_note**: A linking table for notes pertaining to families.

### Table Definitions

Below are the detailed definitions for each table in the schema, including column descriptions and data types.

#### `individual` Table

This table holds the core information about each person in the family tree.

```sql
CREATE TABLE individual (
    id SERIAL PRIMARY KEY,
    gedcom_id VARCHAR(255) UNIQUE, -- The @I...@ identifier from the GEDCOM file
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    sex CHAR(1), -- 'M', 'F', or 'U' for unknown
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `family` Table

This table defines a family unit, linking two individuals as spouses. The GEDCOM standard traditionally uses "husband" and "wife," but this schema uses `spouse1_id` and `spouse2_id` to accommodate any partnership.

```sql
CREATE TABLE family (
    id SERIAL PRIMARY KEY,
    gedcom_id VARCHAR(255) UNIQUE, -- The @F...@ identifier from the GEDCOM file
    spouse1_id INTEGER REFERENCES individual(id),
    spouse2_id INTEGER REFERENCES individual(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `event` Table

This generic table stores various types of events. This approach avoids having separate tables for each event type (e.g., birth, death, marriage).

```sql
CREATE TABLE event (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50), -- e.g., 'BIRT', 'DEAT', 'MARR'
    event_date DATE,
    place VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `source` Table

This table stores information about the sources of the genealogical data, which is a key component of a GEDCOM file.

```sql
CREATE TABLE source (
    id SERIAL PRIMARY KEY,
    gedcom_id VARCHAR(255) UNIQUE, -- The @S...@ identifier from the GEDCOM file
    title TEXT,
    author VARCHAR(255),
    publication_info TEXT,
    repository TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `note` Table

This table is for storing longer text-based notes that can be associated with individuals, families, or events.

```sql
CREATE TABLE note (
    id SERIAL PRIMARY KEY,
    gedcom_id VARCHAR(255) UNIQUE, -- The @N...@ identifier from the GEDCOM file
    text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Linking Tables

The following tables establish the many-to-many relationships between the core entities.

#### `individual_event` Table

Links individuals to their life events.

```sql
CREATE TABLE individual_event (
    individual_id INTEGER REFERENCES individual(id),
    event_id INTEGER REFERENCES event(id),
    PRIMARY KEY (individual_id, event_id)
);
```

#### `family_event` Table

Links families to events like marriage.

```sql
CREATE TABLE family_event (
    family_id INTEGER REFERENCES family(id),
    event_id INTEGER REFERENCES event(id),
    PRIMARY KEY (family_id, event_id)
);
```

#### Relationships within a Family

To represent the parent-child relationships, a linking table between `individual` and `family` is necessary.

```sql
CREATE TABLE child_in_family (
    child_id INTEGER REFERENCES individual(id),
    family_id INTEGER REFERENCES family(id),
    PRIMARY KEY (child_id, family_id)
);
```

#### `individual_source`, `family_source`, `individual_note`, and `family_note` Tables

These tables link individuals and families to their respective sources and notes.

```sql
CREATE TABLE individual_source (
    individual_id INTEGER REFERENCES individual(id),
    source_id INTEGER REFERENCES source(id),
    PRIMARY KEY (individual_id, source_id)
);

CREATE TABLE family_source (
    family_id INTEGER REFERENCES family(id),
    source_id INTEGER REFERENCES source(id),
    PRIMARY KEY (family_id, source_id)
);

CREATE TABLE individual_note (
    individual_id INTEGER REFERENCES individual(id),
    note_id INTEGER REFERENCES note(id),
    PRIMARY KEY (individual_id, note_id)
);

CREATE TABLE family_note (
    family_id INTEGER REFERENCES family(id),
    note_id INTEGER REFERENCES note(id),
    PRIMARY KEY (family_id, note_id)
);
```

### Handling Other GEDCOM Information

The GEDCOM format supports a wide variety of tags and information. This schema can be extended to handle more specific data by adding columns to existing tables or creating new tables. For example, to store occupation, a column `occupation` could be added to the `individual` table. For multimedia objects (`OBJE` tag in GEDCOM), a new `media_object` table could be created and linked to individuals, families, or events.

This proposed schema provides a solid foundation for storing and managing family tree information from GEDCOM files in a PostgreSQL database, allowing for efficient querying and future expansion.