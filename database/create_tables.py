from database.base import Base, engine

import database.alerts
import database.clips
import database.detection_logs
import database.emergency_clips
import database.feed_logs
import database.pet_health_reports
import database.pets
import database.settings
import database.user
import database.water_logs


def main() -> None:
    if engine is None:
        raise RuntimeError("Database engine is not configured.")

    Base.metadata.create_all(bind=engine)
    print("Tables created or already exist:")
    for table_name in sorted(Base.metadata.tables):
        print(f"- {table_name}")


if __name__ == "__main__":
    main()
