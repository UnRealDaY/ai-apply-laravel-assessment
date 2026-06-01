# Assessment Implementation Plan

Pair-programming session — step-by-step reference.
Architecture rule: every change must match the existing code style (inline validation,
user-scoped queries, `<script setup>`, Tailwind utility classes).

---

## Phase 0 — Environment Verification (before any code)

### Windows-specific checks
- [ ] Docker Desktop is running (whale icon in system tray)
- [ ] WSL2 backend enabled (`wsl --status` in PowerShell)
- [ ] Ports 8000, 5173, 3306 are free
- [ ] `.env` exists (copy from `.env.example` if not)

### Bootstrap sequence
```powershell
# From project root in PowerShell:
docker compose up -d
# Wait ~20s for MySQL to initialize on first run

docker compose exec app composer install --no-interaction --prefer-dist
docker compose exec app php artisan key:generate --force
docker compose exec app php artisan migrate:fresh --seed --force
docker compose exec node npm run build
```

### Smoke tests
- [ ] `http://localhost:8000` loads the SPA
- [ ] Login with `candidate@example.com` / `password` works
- [ ] Task list shows seeded tasks
- [ ] Task detail page opens
- [ ] Create / Edit / Delete task works
- [ ] `http://localhost:5173` Vite dev server responds (for hot reload during dev)

---

## Phase 1 — Task 1: Filtering & Search

### What changes
| File | Change |
|------|--------|
| `app/Http/Controllers/Api/TaskController.php` | Add `status` + `search` query param handling to `index()` |
| `resources/js/pages/TaskList.vue` | Add filter bar UI, pass params to API, watch + re-fetch |

### Backend plan
```
index(Request $request):
  1. Start query: $request->user()->tasks()->latest()
  2. If ?status is filled and not 'all' → where('status', $request->status)
  3. If ?search is filled → where('name', 'like', '%'.$request->search.'%')
  4. Return ->get() as JSON
```

### Frontend plan
```
1. Add refs: status = ref('all'), search = ref('')
2. Modify fetchTasks() to pass { params: { status, search } }
3. Add watcher: watch([status, search], fetchTasks)
4. Add UI: filter bar with <select> for status + <input> for search
   - Place between header and table
   - Reset button (optional but nice)
5. Handle empty state: show message when filters return 0 results
   (different copy from "no tasks yet" to avoid confusion)
```

### Commit
```
feat: add server-side task filtering and search
```

---

## Phase 2 — Task 2: Comments Feature

### What changes / creates
| Action | File |
|--------|------|
| CREATE | `database/migrations/XXXX_create_comments_table.php` |
| CREATE | `app/Models/Comment.php` |
| MODIFY | `app/Models/Task.php` — add `hasMany(Comment::class)` |
| CREATE | `app/Http/Controllers/Api/CommentController.php` |
| MODIFY | `routes/api.php` — add nested comments routes |
| MODIFY | `resources/js/pages/TaskShow.vue` — replace placeholder |

### Database schema
```
comments
  id               bigIncrements
  task_id          foreignId → tasks (cascade delete)
  user_id          foreignId → users (cascade delete)
  body             text
  created_at / updated_at
```

### API endpoints
```
GET  /api/tasks/{task}/comments        → index (list comments with user)
POST /api/tasks/{task}/comments        → store (create comment)
```

### Validation (store)
```php
'body' => 'required|string|max:1000'
```

### Authorization
- Same pattern as TaskController: check `$task->user_id === $request->user()->id`
- Any authenticated user can comment on tasks they own (keeping consistent with current scope)

### Eager-load rule
- Always `->with('user')->latest()->get()` on comments (avoids N+1)
- `store()` must return `$comment->load('user')` so Vue can render immediately

### Frontend plan (TaskShow.vue)
```
1. Add fetchComments() — GET /api/tasks/{id}/comments
2. Call fetchComments() in onMounted alongside fetchTask()
3. Add comments ref array
4. Render comment list:
   - Author name (comment.user.name)
   - Formatted date (comment.created_at)
   - Body text
5. Add comment form below list:
   - <textarea> v-model="newComment"
   - Submit button with loading state
   - Validation error display (from API 422 response)
6. submitComment() — POST, push result to top of list, clear textarea
```

### Commits
```
feat: add comments migration, model, controller, and routes
feat: add comments UI to task detail page
```

---

## Phase 3 — Task 3: Real-Time Notifications

### Decision tree (check at start of Phase 3)
```
Time remaining ≥ 45 min  →  Laravel Reverb (full WebSocket)
Time remaining 20-44 min →  Reverb events + polling client (hybrid)
Time remaining < 20 min  →  polling only, narrate the Reverb approach
```

### Option A — Laravel Reverb (full solution)

#### Packages to install
```bash
# PHP (in app container)
composer require laravel/reverb

# JS (in node container or locally)
npm install --save-dev laravel-echo pusher-js
```

#### New files
| File | Purpose |
|------|---------|
| `app/Events/CommentPosted.php` | Broadcastable event |
| `routes/channels.php` | Private channel auth |

#### Modified files
| File | Change |
|------|--------|
| `.env` | BROADCAST_CONNECTION=reverb + Reverb keys |
| `app/Http/Controllers/Api/CommentController.php` | Fire event in store() |
| `resources/js/bootstrap.js` | Initialize Laravel Echo |
| `resources/js/pages/TaskShow.vue` | Subscribe to channel, append new comments |

#### docker-compose addition (Reverb server)
```yaml
reverb:
  build:
    context: .
    dockerfile: docker/Dockerfile
  container_name: assessment_reverb
  restart: unless-stopped
  working_dir: /var/www/html
  volumes:
    - ./:/var/www/html
  networks:
    - app-network
  ports:
    - "8080:8080"
  command: php artisan reverb:start --host=0.0.0.0 --port=8080
  depends_on:
    - app
    - db
```

### Option B — Polling (fallback)
```
In TaskShow.vue:
- setInterval(() => fetchComments(), 5000) while page is open
- clearInterval on onUnmounted
- Narrate: "in production this would be Reverb WebSocket"
```

### Commit
```
feat: add real-time comment notifications via Laravel Reverb
```
or
```
feat: add comment refresh polling (Reverb would be production path)
```

---

## Phase 4 — Bonus: Activity Log (only if ahead of schedule)

### Skip condition
If Phase 3 is not complete, skip entirely.

### Minimal viable implementation (if attempted)
```
1. Migration: activity_logs (id, task_id, user_id, event string, created_at)
2. Log inside CommentController::store() only (single entry point = low risk)
3. Timeline section in TaskShow.vue below comments
```

---

## Known Windows Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Docker not running | `docker: error` on any command | Start Docker Desktop, wait for whale icon |
| WSL2 not enabled | Docker Desktop won't start | `wsl --install` in elevated PowerShell |
| Port 8000 in use | Container starts but site unreachable | `netstat -ano \| findstr :8000` → `taskkill /PID <pid> /F` |
| Port 3306 in use | MySQL container exits immediately | Stop local MySQL service: `Stop-Service mysql` |
| `.env` line endings | Laravel key errors on Windows host | Use `dos2unix` inside container, or let Docker handle it |
| `composer install` fails | PHP ext missing | Runs inside Docker — should not fail |
| `npm run build` hangs | Node container not started | `docker compose up node -d` first |
| Vite HMR not working | Changes don't reflect | Use `npm run dev -- --host` in node container (already in compose) |
| MySQL slow first start | DB not ready for migrations | Wait 30s after `docker compose up -d` before running artisan |

---

## Quick Reference Commands (PowerShell)

```powershell
# Start everything
docker compose up -d

# Run artisan commands
docker compose exec app php artisan <command>

# Run composer
docker compose exec app composer <command>

# Run npm
docker compose exec node npm <command>

# Watch Laravel logs
docker compose logs -f app

# Access MySQL directly
docker compose exec db mysql -u laravel -psecret laravel

# Rebuild after Dockerfile change
docker compose up -d --build app

# Full reset (nuclear option)
docker compose down -v
docker compose up -d
# then re-run bootstrap sequence
```

---

## Status Tracker

- [ ] Phase 0 — Environment verified and app running
- [ ] Task 1 — Filtering & Search complete
- [ ] Task 2 — Comments Feature complete  
- [ ] Task 3 — Real-time Notifications complete
- [ ] Bonus — Activity Log (optional)
