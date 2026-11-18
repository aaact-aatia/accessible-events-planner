# Test plan

Tests will be implemented as features are added. No test suite runs yet.

- Compare source action IDs, wording, supporting text and links against the original supplied HTML.
- Verify every original routing section and option, item-level conditions, required answers and the existing 73,728 valid input combinations.
- Verify filtering happens before merging and exact duplicates never discard distinct guidance.
- Verify complete guide without JavaScript; personalized URL round-trips, editing, history, invalid parameters and failure fallback.
- Check keyboard operation, focus order and focus management, screen reader semantics, headings, link names, reflow at 400% zoom and forced-colors mode.
- Verify printing and downloaded HTML include all applicable guidance and barriers, preserve meaningful structure, exclude application controls and work offline.
- Test in actual browsers and assistive technologies before release. Automated checks alone do not establish accessibility conformance.
