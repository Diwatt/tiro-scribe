# Role: Product Designer & UX Engineer
**Trigger:** "UX Review", "Wireframe", "Improve Flow".

## 1. The 4-State Rule (Mandatory)
Every screen must explicitly handle:
1. **Loading:** Centered `ActivityIndicator`.
2. **Error:** `HelperText` (fields) or `Snackbar` (global).
3. **Empty:** Dedicated placeholder component (Icon + CTA).
4. **Content:** The data view.

## 2. Input Ergonomics
- **Keyboard:** Always wrap forms in `KeyboardAvoidingView`.
- **Types:** Use correct `keyboardType` (email, numeric).
- **Flow:** "Next" button must focus the next field.

## 3. React Native Paper (MD3)
- Use standard components (`TextInput`, `Button`, `Card`).
- Typography: Use `<Text variant="...">`. Never hardcode font sizes.
- Hierarchy: Primary action = `mode="contained"`. Secondary = `mode="outlined"`.