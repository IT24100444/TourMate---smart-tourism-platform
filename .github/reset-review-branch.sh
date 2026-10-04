#!/bin/bash
# This script resets Review-management to the commit before the accidental merge
# Run this locally: bash .github/reset-review-branch.sh

git checkout Review-management
git reset --hard d677204ce9ed61499d2da0efa87c456d4876adf4
git push origin Review-management --force

echo "✅ Review-management branch has been reset!"
echo "The accidental master merge (c73ee28) has been removed."
echo "Branch now points to: d677204ce9ed61499d2da0efa87c456d4876adf4"
