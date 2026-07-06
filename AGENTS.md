<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployment and Version Control Rules

- **DO NOT** execute automatic git commits, pushes, or run deploy scripts (`deploy-vps.bat`, etc.) to Oracle VPS, GitHub, or Supabase automatically. Always let the user handle commits, pushes, and deployments manually after they verify their tests.
