#!/bin/bash
set -e

# === CONFIGURATION ===
SRC_DIR="chromium_src"             # Chrome extension source folder
BUILD_DIR="build_firefox"
OUT_ZIP="firefox_src.zip"
FIREFOX_ID="igowhen@example.com"   # your Firefox add-on ID

# === CLEAN AND COPY ===
rm -rf "$BUILD_DIR" "$OUT_ZIP"
mkdir -p "$BUILD_DIR"
cp -r "$SRC_DIR"/* "$BUILD_DIR"

echo "🦊 Building Firefox (Manifest V2) extension..."

MANIFEST="$BUILD_DIR/manifest.json"

if [ ! -f "$MANIFEST" ]; then
  echo "❌ manifest.json not found"
  exit 1
fi

# --- Transform manifest.json for Firefox ---
jq --arg id "$FIREFOX_ID" '
  # downgrade to MV2
  .manifest_version = 2

  # rename "action" -> "browser_action"
  | if .action then
      .browser_action = .action
    | del(.action)
    else
      .
    end

  # convert background.service_worker -> background.scripts
  | .background = { "scripts": ["background.js"] }

  # merge host_permissions into permissions
  | if .host_permissions then
      .permissions = (.permissions + .host_permissions | unique)
    | del(.host_permissions)
    else
      .
    end

  # remove unsupported permissions
  | .permissions |= map(select(. != "scripting"))

  # add Firefox-specific metadata
  | . + {
      "browser_specific_settings": {
        "gecko": {
          "id": $id,
          "strict_min_version": "90.0"
        }
      }
    }
' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"

echo "✅ Manifest converted for Firefox (MV2)."

# --- PACKAGE ZIP ---
cd "$BUILD_DIR"
zip -r "../$OUT_ZIP" ./* >/dev/null
cd ..

echo "📦 Built Firefox extension: $OUT_ZIP"
echo "✨ Load it in Firefox via about:debugging#/runtime/this-firefox"
