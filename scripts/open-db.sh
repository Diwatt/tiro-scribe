#!/bin/bash

# This helper locates the sqlite database used by the Expo app when running
# in either an iOS simulator or an Android emulator and opens it with
# DBeaver (or any other application you choose).
#
# Usage: just execute the script while a simulator/emulator is booted.
# You may need to `chmod +x scripts/open-db.sh` once.

# ---- configuration -------------------------------------------------------
# change these values for your project.  'APP_PACKAGE' is the bundle id
# used by Expo (host.exp.Exponent).
APP_PACKAGE="com.tiroscribe.app"
# DB_NAME will be auto‑filled from `.env` or default to the value used by
# the app (see src/Config/AppConfig.ts).  You may override it manually here
# if you want to open a different database file.
DB_NAME=""                     # optional; database filename (e.g. mydb.sqlite)
DB_LOCAL_TEMP=""               # filled in later if needed for Android
DB_CLIENT="DBeaver"            # the application used to open the file
# --------------------------------------------------------------------------

# compute default database name if not provided
if [ -z "$DB_NAME" ]; then
    if [ -f ".env" ]; then
        # read EXPO_PUBLIC_DATABASE_NAME from .env (simple KEY=VALUE)
        DB_NAME=$(grep '^EXPO_PUBLIC_DATABASE_NAME=' .env | cut -d '=' -f2-)
    fi
    # fallback to the hardcoded default used by AppConfig
    DB_NAME=${DB_NAME:-tiro-scribe.sqlite}
fi

echo "looking for database named: $DB_NAME"

# helper to open a path if it exists
open_if_exists() {
    if [ -f "$1" ]; then
        echo "Opening database: $1"
        open -a "$DB_CLIENT" "$1"
        exit 0
    fi
}

# 1. try iOS simulator
DEVICE_ID=$(xcrun simctl list devices 2>/dev/null | grep "Booted" | \
    grep -E -o -i "([0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12})" | head -n 1)

if [ -n "$DEVICE_ID" ]; then
    echo "iOS simulator detected: $DEVICE_ID"
    # try the canonical container first
    APP_DATA_PATH=$(xcrun simctl get_app_container "$DEVICE_ID" "$APP_PACKAGE" data 2>/dev/null)
    if [ -n "$APP_DATA_PATH" ]; then
        if [ -z "$DB_NAME" ]; then
            DB_PATH=$(ls "$APP_DATA_PATH/Documents/SQLite"/*.{db,sqlite} 2>/dev/null | head -n1)
        else
            DB_PATH="$APP_DATA_PATH/Documents/SQLite/$DB_NAME"
        fi
        echo "candidate iOS path: $DB_PATH"
        open_if_exists "$DB_PATH"
    fi

    # if nothing found yet, scan all installed apps for a sqlite file; this
    # helps when running Expo dev client or any unidentified bundle id.
    if [ -z "$DB_PATH" ] || [ ! -f "$DB_PATH" ]; then
        SIM_DATA_ROOT="$HOME/Library/Developer/CoreSimulator/Devices/$DEVICE_ID/data/Containers/Data/Application"
        if [ -d "$SIM_DATA_ROOT" ]; then
            # try exact match first (hyphen vs underscore matters), then look for *.sqlite, then *.db
            DB_PATH=""
            if [ -n "$DB_NAME" ]; then
                DB_PATH=$(find "$SIM_DATA_ROOT" -path "*/Documents/SQLite/$DB_NAME" | head -n1)
            fi
            if [ -z "$DB_PATH" ]; then
                DB_PATH=$(find "$SIM_DATA_ROOT" -path '*/Documents/SQLite/*.sqlite' | head -n1)
            fi
            if [ -z "$DB_PATH" ]; then
                DB_PATH=$(find "$SIM_DATA_ROOT" -path '*/Documents/SQLite/*.db' | head -n1)
            fi
            echo "scanned iOS path: $DB_PATH"
            open_if_exists "$DB_PATH"
        fi
    fi
fi

# 2. try Android emulator
ANDROID_DEVICE=$(adb devices | grep emulator | awk '{print $1}' | head -n 1)
if [ -n "$ANDROID_DEVICE" ]; then
    echo "Android emulator detected: $ANDROID_DEVICE"
    ADB="adb -s $ANDROID_DEVICE"

    # if we don't have a name yet, list databases and pick the first .db/.sqlite
    # FIX: Nouveau chemin expo-sqlite -> files/SQLite
    if [ -z "$DB_NAME" ]; then
        DB_NAME=$($ADB shell "run-as $APP_PACKAGE ls /data/data/$APP_PACKAGE/files/SQLite" 2>/dev/null | grep -E '\.(db|sqlite)$' | head -n1 | tr -d '\r')
    fi

    # Some builds (e.g. Expo Go from Play Store) are not debuggable and run-as will fail.
    # On emulators we can often use `adb root` and pull the file directly.
    if [ -z "$DB_NAME" ]; then
        echo "run-as failed or no database found; attempting root access (emulator only)."
        $ADB root >/dev/null 2>&1
        DB_NAME=$($ADB shell "ls /data/data/$APP_PACKAGE/files/SQLite" 2>/dev/null | grep -E '\.(db|sqlite)$' | head -n1 | tr -d '\r')
    fi

    if [ -n "$DB_NAME" ]; then
        # Save pulled DB into the project root so it's easy to find from the repo.
        # Compute the project root relative to this script's location.
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
        PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd)"
        DB_LOCAL_TEMP="$PROJECT_ROOT/$DB_NAME"

        # Prefer run-as when possible (works for debug builds), otherwise fall back to root + pull.
        if $ADB shell "run-as $APP_PACKAGE cat /data/data/$APP_PACKAGE/files/SQLite/$DB_NAME" > "$DB_LOCAL_TEMP" 2>/dev/null; then
            # Télécharge aussi les fichiers WAL et SHM
            $ADB shell "run-as $APP_PACKAGE cat /data/data/$APP_PACKAGE/files/SQLite/$DB_NAME-wal" > "$DB_LOCAL_TEMP-wal" 2>/dev/null || true
            $ADB shell "run-as $APP_PACKAGE cat /data/data/$APP_PACKAGE/files/SQLite/$DB_NAME-shm" > "$DB_LOCAL_TEMP-shm" 2>/dev/null || true

            echo "candidate Android path: $DB_LOCAL_TEMP"
            open_if_exists "$DB_LOCAL_TEMP"
        else
            echo "run-as failed; trying adb root + pull (emulator)."
            $ADB root >/dev/null 2>&1
            $ADB pull "/data/data/$APP_PACKAGE/files/SQLite/$DB_NAME" "$DB_LOCAL_TEMP" >/dev/null 2>&1
            $ADB pull "/data/data/$APP_PACKAGE/files/SQLite/$DB_NAME-wal" "$DB_LOCAL_TEMP-wal" >/dev/null 2>&1
            $ADB pull "/data/data/$APP_PACKAGE/files/SQLite/$DB_NAME-shm" "$DB_LOCAL_TEMP-shm" >/dev/null 2>&1

            echo "candidate Android path: $DB_LOCAL_TEMP"
            open_if_exists "$DB_LOCAL_TEMP"
        fi
    fi
fi

echo "No running iOS simulator or Android emulator with a reachable database was found."
exit 1
