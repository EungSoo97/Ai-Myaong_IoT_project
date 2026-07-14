-- Prevent duplicate automatic feed/water logs in the same minute.
-- Run this after confirming duplicated auto logs can be collapsed safely.
--
-- Keeps the oldest row per duplicate group and removes the rest.
-- Manual/quick logs are not affected by the unique indexes.

DELETE FROM FEED_LOGS
WHERE FEED_ID IN (
    SELECT FEED_ID
    FROM (
        SELECT
            FEED_ID,
            ROW_NUMBER() OVER (
                PARTITION BY
                    USER_ID,
                    PET_ID,
                    FEED_TYPE,
                    TRUNC(CREATED_AT, 'MI')
                ORDER BY FEED_ID
            ) AS RN
        FROM FEED_LOGS
        WHERE FEED_TYPE = 'auto'
    )
    WHERE RN > 1
);

DELETE FROM WATER_LOGS
WHERE WATER_LOG_ID IN (
    SELECT WATER_LOG_ID
    FROM (
        SELECT
            WATER_LOG_ID,
            ROW_NUMBER() OVER (
                PARTITION BY
                    USER_ID,
                    PET_ID,
                    WATER_TYPE,
                    TRUNC(CREATED_AT, 'MI')
                ORDER BY WATER_LOG_ID
            ) AS RN
        FROM WATER_LOGS
        WHERE WATER_TYPE = 'auto'
    )
    WHERE RN > 1
);

CREATE UNIQUE INDEX UQ_FEED_LOGS_AUTO_MINUTE
ON FEED_LOGS (
    CASE WHEN FEED_TYPE = 'auto' THEN USER_ID END,
    CASE WHEN FEED_TYPE = 'auto' THEN PET_ID END,
    CASE WHEN FEED_TYPE = 'auto' THEN TRUNC(CREATED_AT, 'MI') END
);

CREATE UNIQUE INDEX UQ_WATER_LOGS_AUTO_MINUTE
ON WATER_LOGS (
    CASE WHEN WATER_TYPE = 'auto' THEN USER_ID END,
    CASE WHEN WATER_TYPE = 'auto' THEN PET_ID END,
    CASE WHEN WATER_TYPE = 'auto' THEN TRUNC(CREATED_AT, 'MI') END
);

COMMIT;
