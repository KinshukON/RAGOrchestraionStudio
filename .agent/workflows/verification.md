---
description: How to verify changes in this project
---

## CRITICAL: Deployment Stack

This project uses:
- **Frontend**: Vercel — `https://ragorchestrationstudio.com`
- **Backend**: Railway — backend URL configured in frontend env

**NEVER attempt to verify via localhost (localhost:5173, localhost:5174, etc.).**
The app is NOT run locally for verification. Instead:

1. Push changes to git (`git add -A && git commit -m "..." && git push`)
2. Wait for Vercel to deploy (auto-triggered on push)
3. Ask the user to verify at https://ragorchestrationstudio.com
4. For TypeScript correctness only: `cd frontend && npx tsc --noEmit`
5. For backend correctness only: inspect the Python files directly with grep/view_file

## Verification Checklist
- [ ] TypeScript compiles: `npx tsc --noEmit` in `frontend/`
- [ ] No obvious Python syntax errors (view the file)
- [ ] Push to git and let Vercel deploy
- [ ] Ask user to confirm at the live Vercel URL
