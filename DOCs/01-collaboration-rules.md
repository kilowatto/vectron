# Collaboration rules / Reglas de colaboración

**Applies to / Aplica a:** humans, Cursor, Claude, Codex, Antigravity, ChatGPT, and any other agent working in this repo.

---

## English

### 0. First principles (MUST)

1. **Do not destroy other people’s work.** Prefer extend/adapt over rewrite. If a rewrite seems necessary, explain why and get explicit approval.
2. **Read before you write.** Relevant files, `DOCs/`, and `DOCs/archive/` first.
3. **Smallest change that achieves the goal.** No drive-by refactors, no unrelated file edits, no “while I’m here” cleanups.
4. **Bilingual always.** User-facing strings: `es` + `en` in `i18n.ts` (or equivalent). Docs under `DOCs/`: English + Spanish. Do not ship one language only.
5. **Ask when product intent is ambiguous.** Especially anything that changes the three-app split, audiences, or the locked product names Principiante / Intermedio / Avanzado.

### 1. Respect the three apps (product names locked)

Vectron is becoming **three products** (see `02-master-plan.md`).

**MUST — naming:** UI and product language use **Principiante / Intermedio / Avanzado** (EN: Beginner / Intermediate / Advanced). Do not rename the product to “University app” / “Research app” in the UI. Those are audience labels for builders only.

| Product name | Code id (ok internally) | Audience | Do not |
|--------------|-------------------------|----------|--------|
| **Principiante** | `principiante` | Kids/teens + non-technical adults impressed by ChatGPT | Expose jargon (cosine, ℝ⁷⁶⁸, BPE IDs, PCA) |
| **Intermedio** | `intermedio` | University | Skip the pipeline story (tokens → embed → neighbors → RAG) |
| **Avanzado** | `avanzado` | PhD / serious data science & ML — **ceiling is PhD rigor** | Dumb down into metaphors only; hide approximations |

- Shared infrastructure (Worker, dataset, renderer primitives) is OK.
- Shared *product UI/copy* across apps is **not** OK if it collapses the audiences.
- Filtering by part-of-speech alone is **not** a substitute for three apps (legacy approach — see archive).
- Attention/KaTeX math is **LATER** for Avanzado; do not block PhD-grade instrument work on bringing it back early.

### 2. Code ownership & safety

- **Do not delete** large modules, datasets, seed scripts, or migrations without explicit user request.
- **Do not regenerate** embeddings / re-seed production data unless asked (cost + reproducibility).
- **Do not commit secrets** (`.env`, API keys, wrangler oauth tokens, account-specific tokens hardcoded).
- Match existing style: TypeScript, no unnecessary new frameworks, reuse patterns in `app/src` and `worker/src`.
- Comments: only when they explain non-obvious intent; no narrating what the code obviously does.
- If two agents might touch the same area, prefer sequential work or clearly scoped files.

### 3. Git & commits (MUST)

- **Never commit unless the user explicitly asks** to commit.
- Never update git config.
- Never force-push to `main`/`master`.
- Never use destructive git (`reset --hard`, `push --force`) unless the user explicitly requests it.
- Never `--no-verify` / skip hooks unless explicitly requested.
- Do not commit ignored secrets or credential files.
- When asked to commit:
  1. `git status`, `git diff`, `git log` (style)
  2. Stage only relevant files
  3. Commit with a clear message (why > what), HEREDOC form
  4. `git status` to verify
- Prefer one logical commit per request unless the user asks otherwise.

### 4. Deploys (MUST)

- **Never deploy** (`wrangler deploy`, production publish, DNS/route changes) unless the user explicitly asks.
- Local ok by default: `pnpm dev`, `pnpm dev:worker`, `pnpm build`.
- After deploy (when asked): verify health endpoint and the affected app surface in the browser.
- Do not change `wrangler.toml` routes, account IDs, or binding names casually — treat as production config.

### 5. Testing — especially browser (MUST for UI)

For any UI / 3D / interaction change:

1. Run the app locally when possible (`pnpm dev`; worker if API needed).
2. **Test in the browser** (Cursor browser tools or equivalent): load, click, type, switch language, switch app/mode.
3. Verify **both languages** (`es` and `en`) for any new user-visible string.
4. Check desktop and a narrow viewport when layout is touched.
5. If WebGPU fails, confirm WebGL fallback still works (see engine).
6. Report what you verified (or what you could not verify and why).

Backend-only changes: hit the relevant `/api/*` paths; do not claim “done” on UI without a browser pass when UI was involved.

### 6. AI-specific rules

- You are a collaborator, not the product owner. The user owns audience and pedagogy decisions.
- Do not invent roadmap items that contradict `02-master-plan.md`.
- Do not “simplify” Avanzado honesty (declared approximations must stay visible; PhD ceiling).
- Do not dump huge unrelated markdown files outside `DOCs/` unless asked.
- If a skill/rule exists for the task (Cloudflare, browser perf, etc.), read it first.
- When stuck after repeated failures, stop looping — report evidence and ask.

### 7. Conflict resolution

| Conflict | Resolution |
|----------|------------|
| Doc vs code | Fix the outdated one; if unsure, ask |
| Two AIs disagree | Prefer existing `DOCs/` + user instruction |
| Speed vs safety | Safety wins (no destroy, no silent deploy) |
| Pretty demo vs honesty | Honesty wins in Intermedio + Avanzado |

### 8. Definition of done (feature)

- [ ] Goal met with minimal diff
- [ ] No unrelated files touched
- [ ] `es` + `en` for user-facing text
- [ ] Browser verification done (if UI) or API check (if API)
- [ ] Docs updated if product/engineering intent changed
- [ ] Archive entry if a previous approach was superseded
- [ ] Commit only if user asked

---

## Español

### 0. Principios primero (OBLIGATORIO)

1. **No destruyas el trabajo de otros.** Prefiere extender/adaptar antes que reescribir. Si hace falta un rewrite, explica por qué y pide aprobación explícita.
2. **Lee antes de escribir.** Archivos relevantes, `DOCs/` y `DOCs/archive/` primero.
3. **El cambio más pequeño que cumpla el objetivo.** Sin refactors de paso, sin editar archivos no relacionados, sin limpiezas “ya que estoy”.
4. **Siempre bilingüe.** Strings de usuario: `es` + `en` en `i18n.ts` (o equivalente). Docs en `DOCs/`: inglés + español. No entregues un solo idioma.
5. **Pregunta si la intención de producto es ambigua.** Sobre todo si cambia el split de tres apps, las audiencias, o los nombres cerrados Principiante / Intermedio / Avanzado.

### 1. Respetar las tres apps (nombres de producto cerrados)

Vectron se convierte en **tres productos** (ver `02-master-plan.md`).

**OBLIGATORIO — nombres:** La UI y el lenguaje de producto usan **Principiante / Intermedio / Avanzado** (EN: Beginner / Intermediate / Advanced). No renombrar el producto a “app Universidad / Research” en la UI. Esas son etiquetas de audiencia para builders.

| Nombre de producto | Id interno OK | Audiencia | No hacer |
|--------------------|---------------|-----------|----------|
| **Principiante** | `principiante` | Niños/adolescentes + adultos no técnicos impresionados por ChatGPT | Exponer jerga (coseno, ℝ⁷⁶⁸, IDs BPE, PCA) |
| **Intermedio** | `intermedio` | Universidad | Saltar la historia del pipeline (tokens → embed → vecinos → RAG) |
| **Avanzado** | `avanzado` | PhD / ciencia de datos y ML serios — **techo = rigor PhD** | Dejarlo solo en metáforas; ocultar aproximaciones |

- Compartir infraestructura (Worker, dataset, primitivas de render) está bien.
- Compartir *UI/copy de producto* entre apps **no** está bien si colapsa las audiencias.
- Filtrar solo por categoría gramatical **no** sustituye tres apps (enfoque legacy — ver archive).
- La matemática Attention/KaTeX es **LATER** en Avanzado; no bloquear el instrumento nivel PhD por traerla antes de tiempo.

### 2. Propiedad del código y seguridad

- **No borrar** módulos grandes, datasets, scripts de seed o migraciones sin petición explícita del usuario.
- **No regenerar** embeddings / re-sembrar datos de producción salvo que se pida (costo + reproducibilidad).
- **No commitear secretos** (`.env`, API keys, tokens oauth de wrangler, tokens de cuenta hardcodeados).
- Seguir el estilo existente: TypeScript, sin frameworks nuevos innecesarios, reutilizar patrones en `app/src` y `worker/src`.
- Comentarios: solo cuando expliquen intención no obvia; no narrar lo obvio.
- Si dos agentes pueden tocar la misma zona, preferir trabajo secuencial o archivos claramente acotados.

### 3. Git y commits (OBLIGATORIO)

- **Nunca hagas commit** salvo que el usuario lo pida explícitamente.
- Nunca actualizar git config.
- Nunca force-push a `main`/`master`.
- Nunca git destructivo (`reset --hard`, `push --force`) salvo petición explícita.
- Nunca `--no-verify` / saltar hooks salvo petición explícita.
- No commitear secretos ni credenciales.
- Cuando pidan commit:
  1. `git status`, `git diff`, `git log` (estilo)
  2. Stage solo archivos relevantes
  3. Commit con mensaje claro (por qué > qué), forma HEREDOC
  4. `git status` para verificar
- Preferir un commit lógico por petición salvo que indiquen otra cosa.

### 4. Deploys (OBLIGATORIO)

- **Nunca desplegar** (`wrangler deploy`, publish a producción, cambios DNS/rutas) salvo que el usuario lo pida explícitamente.
- Local OK por defecto: `pnpm dev`, `pnpm dev:worker`, `pnpm build`.
- Tras un deploy (cuando lo pidan): verificar health y la superficie afectada en el navegador.
- No cambiar a la ligera routes, account IDs o nombres de bindings en `wrangler.toml` — es config de producción.

### 5. Pruebas — sobre todo navegador (OBLIGATORIO para UI)

Para cualquier cambio de UI / 3D / interacción:

1. Correr la app en local cuando sea posible (`pnpm dev`; worker si hace falta la API).
2. **Probar en el navegador** (herramientas browser de Cursor o equivalente): cargar, clic, escribir, cambiar idioma, cambiar app/modo.
3. Verificar **ambos idiomas** (`es` y `en`) ante cualquier string nuevo visible.
4. Revisar desktop y viewport estrecho si se toca layout.
5. Si WebGPU falla, confirmar que el fallback WebGL sigue funcionando.
6. Reportar qué se verificó (o qué no se pudo y por qué).

Cambios solo de backend: pegarle a los `/api/*` relevantes; no declarar “listo” en UI sin pase de navegador si hubo UI involucrada.

### 6. Reglas específicas para IA

- Eres colaborador, no dueño del producto. El usuario decide audiencias y pedagogía.
- No inventes roadmap que contradiga `02-master-plan.md`.
- No “simplifiques” la honestidad de Avanzado (las aproximaciones declaradas deben seguir visibles; techo PhD).
- No generes markdown enorme fuera de `DOCs/` salvo que se pida.
- Si existe un skill/regla para la tarea (Cloudflare, perf de browser, etc.), léelo primero.
- Si te atascas tras fallos repetidos, deja de loopear — reporta evidencia y pregunta.

### 7. Resolución de conflictos

| Conflicto | Resolución |
|-----------|------------|
| Doc vs código | Corregir el desactualizado; si hay duda, preguntar |
| Dos IAs discrepan | Preferir `DOCs/` existente + instrucción del usuario |
| Velocidad vs seguridad | Gana la seguridad (no destruir, no deploy silencioso) |
| Demo bonita vs honestidad | Gana la honestidad en Intermedio + Avanzado |

### 8. Definición de terminado (feature)

- [ ] Objetivo cumplido con diff mínimo
- [ ] Sin archivos no relacionados
- [ ] `es` + `en` en texto de usuario
- [ ] Verificación en navegador (si UI) o chequeo API (si API)
- [ ] Docs actualizados si cambió la intención de producto/ingeniería
- [ ] Entrada en archive si se reemplazó un enfoque previo
- [ ] Commit solo si el usuario lo pidió
