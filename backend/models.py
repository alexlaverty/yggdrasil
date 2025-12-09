from sqlalchemy import Table, Column, Integer, String, TIMESTAMP, func, Date, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base

individual_event = Table('individual_event', Base.metadata,
    Column('individual_id', Integer, ForeignKey('individual.id')),
    Column('event_id', Integer, ForeignKey('event.id'))
)

family_event = Table('family_event', Base.metadata,
    Column('family_id', Integer, ForeignKey('family.id')),
    Column('event_id', Integer, ForeignKey('event.id'))
)

child_in_family = Table('child_in_family', Base.metadata,
    Column('child_id', Integer, ForeignKey('individual.id')),
    Column('family_id', Integer, ForeignKey('family.id'))
)

individual_source = Table('individual_source', Base.metadata,
    Column('individual_id', Integer, ForeignKey('individual.id')),
    Column('source_id', Integer, ForeignKey('source.id'))
)

family_source = Table('family_source', Base.metadata,
    Column('family_id', Integer, ForeignKey('family.id')),
    Column('source_id', Integer, ForeignKey('source.id'))
)

individual_note = Table('individual_note', Base.metadata,
    Column('individual_id', Integer, ForeignKey('individual.id')),
    Column('note_id', Integer, ForeignKey('note.id'))
)

family_note = Table('family_note', Base.metadata,
    Column('family_id', Integer, ForeignKey('family.id')),
    Column('note_id', Integer, ForeignKey('note.id'))
)

media_individual = Table('media_individual', Base.metadata,
    Column('media_id', Integer, ForeignKey('media.id')),
    Column('individual_id', Integer, ForeignKey('individual.id'))
)

media_event = Table('media_event', Base.metadata,
    Column('media_id', Integer, ForeignKey('media.id')),
    Column('event_id', Integer, ForeignKey('event.id'))
)

class Individual(Base):
    __tablename__ = 'individual'

    id = Column(Integer, primary_key=True, autoincrement=True)
    gedcom_id = Column(String(255), unique=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    sex = Column(String(1))  # 'M', 'F', 'U'
    profile_image_id = Column(Integer, ForeignKey('media.id'), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    events = relationship("Event", secondary=individual_event, overlaps="individuals")
    families_as_spouse = relationship("Family", primaryjoin="Individual.id == Family.spouse1_id")
    families_as_spouse2 = relationship("Family", primaryjoin="Individual.id == Family.spouse2_id")
    families_as_child = relationship("Family", secondary=child_in_family)
    sources = relationship("Source", secondary=individual_source, overlaps="individuals")
    notes = relationship("Note", secondary=individual_note, overlaps="individuals")
    media = relationship("Media", secondary=media_individual)
    profile_image = relationship("Media", foreign_keys=[profile_image_id])

class Family(Base):
    __tablename__ = 'family'

    id = Column(Integer, primary_key=True, autoincrement=True)
    gedcom_id = Column(String(255), unique=True)
    spouse1_id = Column(Integer, ForeignKey('individual.id'))
    spouse2_id = Column(Integer, ForeignKey('individual.id'))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    spouse1 = relationship("Individual", foreign_keys=[spouse1_id], overlaps="families_as_spouse")
    spouse2 = relationship("Individual", foreign_keys=[spouse2_id], overlaps="families_as_spouse2")
    children = relationship("Individual", secondary=child_in_family, overlaps="families_as_child")
    events = relationship("Event", secondary=family_event, overlaps="families")
    sources = relationship("Source", secondary=family_source, overlaps="families")
    notes = relationship("Note", secondary=family_note, overlaps="families")

class Event(Base):
    __tablename__ = 'event'

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(50))  # 'BIRT', 'DEAT', 'MARR'
    event_date = Column(Date)
    place = Column(String(255))
    description = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    individuals = relationship("Individual", secondary=individual_event, overlaps="events")
    families = relationship("Family", secondary=family_event, overlaps="events")
    media = relationship("Media", secondary=media_event, back_populates="events")

class Source(Base):
    __tablename__ = 'source'

    id = Column(Integer, primary_key=True, autoincrement=True)
    gedcom_id = Column(String(255), unique=True)
    title = Column(Text)
    author = Column(String(255))
    publication_info = Column(Text)
    repository = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    individuals = relationship("Individual", secondary=individual_source, overlaps="sources")
    families = relationship("Family", secondary=family_source, overlaps="sources")

class Note(Base):
    __tablename__ = 'note'

    id = Column(Integer, primary_key=True, autoincrement=True)
    gedcom_id = Column(String(255), unique=True)
    text = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    individuals = relationship("Individual", secondary=individual_note, overlaps="notes")
    families = relationship("Family", secondary=family_note, overlaps="notes")

class Media(Base):
    __tablename__ = 'media'

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)  # Path in MinIO
    thumbnail_path = Column(String(512), nullable=True)  # Thumbnail path in MinIO
    media_type = Column(String(50))  # 'image', 'video', 'document', etc.
    file_size = Column(Integer)  # Size in bytes
    media_date = Column(Date)  # When the media was taken/created
    description = Column(Text)  # Optional description
    extracted_text = Column(Text)  # Text extracted from document
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Many-to-many relationship with individuals
    individuals = relationship("Individual", secondary=media_individual)
    # Many-to-many relationship with events
    events = relationship("Event", secondary=media_event, back_populates="media")


class Place(Base):
    __tablename__ = 'place'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(512), unique=True, nullable=False)  # Original place name from GEDCOM
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geocoded = Column(Integer, default=0)  # 0=not attempted, 1=success, -1=failed
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())