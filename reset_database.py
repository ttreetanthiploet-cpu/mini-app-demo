import json
import os

files_to_reset = [
    "conversation.json",
    "restructure_offer_account.json",
    "restructure_offer_summary.json",
    "session_info.json",
    "staff_escalation_info.json",
]

for filename in files_to_reset:
    filepath = f"database/{filename}"
    if os.path.exists(filepath):
        with open(filepath, "w") as f:
            json.dump([], f)
        print(f"Reset: {filepath}")
    else:
        print(f"Not found (skipped): {filepath}")

print("Done.")
