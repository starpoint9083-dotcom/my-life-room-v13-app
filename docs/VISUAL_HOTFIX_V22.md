# P2 V22 visual compositing hotfix

This hotfix addresses two live defects reproduced on Android:

1. Destructive studio-background removal could erase face, arm, clothing, or pet pixels.
2. Pose rotation could restore the raw rectangular master image instead of the validated transparent cutout.

Safety rules:
- Use conservative edge-connected background removal.
- Reject suspicious cutouts by alpha/bounding-box audit.
- Never fall back to a raw rectangular avatar in the room.
- Pose images use the same validated cutout path as the master avatar.
- If a pose fails validation, keep the last known-good transparent avatar rather than showing a broken asset.
- Pet assets follow the same safe-cutout rule.
- Live deployment verification checks these guarantees.
