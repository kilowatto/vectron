# Docs management rules / Reglas de manejo de documentación

## English

### Purpose

`DOCs/` is the source of truth for product intent, engineering norms, and historical snapshots. Code explains *how*; docs explain *why* and *what must not be broken*.

### Folder layout

```
DOCs/
  README.md                 # Index (always bilingual)
  00-docs-management.md     # This file — how docs are handled
  01-collaboration-rules.md # Humans + AI operating rules
  02-master-plan.md         # Master product plan (merged)
  archive/                  # Frozen snapshots of built work / past plans
    YYYY-MM-DD-short-title.md
```

### Language (mandatory)

- Every new or updated doc under `DOCs/` **must** include **English and Spanish**.
- Preferred format: one file with `## English` followed by `## Español` (same structure, same headings).
- UI strings in the app already use `i18n.ts` (`es` + `en`). Docs follow the same bilingual contract.
- If you cannot complete both languages in one pass, **do not merge** the doc incomplete — finish both sections or leave a clearly marked `TODO(i18n)` and finish before the PR is considered done.
- Commit messages may be English or Spanish; PR descriptions that touch product/docs should summarize in **both** languages (short is fine).

### When to write or update a doc

| Situation | Action |
|-----------|--------|
| New product decision (audiences, app split, pedagogy) | Update `02-master-plan.md` |
| New engineering norm (commits, deploy, tests) | Update `01-collaboration-rules.md` |
| Substantial feature shipped or architecture replaced | Add a dated file under `archive/` describing *what existed* and *what changed* |
| Experimental spike abandoned | Archive a short note; do not delete history without reason |
| Only code refactors, no intent change | No doc update required |

### Archive rules (`DOCs/archive/`)

- **Archive = freeze, do not rewrite history.** New reality goes in live docs; old reality goes to `archive/`.
- Filename: `YYYY-MM-DD-kebab-title.md` (UTC or local project date is fine; be consistent).
- Each archive file must state:
  1. Date
  2. What was true / built at that time
  3. Why it was archived (superseded, split into 3 apps, etc.)
  4. Pointers to current live docs
- Never delete archive files to “clean up” unless the user explicitly asks.
- The first archive entry documents the **pre–three-apps** monolithic mode switcher prototype.

### Writing style

- Be specific and actionable. Prefer tables and checklists over essays.
- Do not duplicate large code blocks — link to paths (`app/src/...`, `worker/src/...`).
- Mark open questions as `Open question / Pregunta abierta`.
- Mark non-negotiables as `MUST / OBLIGATORIO`.

### Ownership

- Humans and AIs may propose doc edits.
- Conflicting product direction: stop and ask the user; do not silently overwrite `02-master-plan.md`.
- Docs changes that redefine audiences or destroy archived intent require explicit user approval.

### Checklist before finishing a docs change

- [ ] English section complete
- [ ] Spanish section complete (same headings)
- [ ] Links from `DOCs/README.md` still valid
- [ ] If superseding an old plan, archived the previous state first

---

## Español

### Propósito

`DOCs/` es la fuente de verdad de la intención de producto, normas de ingeniería e instantáneas históricas. El código explica *cómo*; los docs explican *por qué* y *qué no se debe romper*.

### Estructura de carpetas

```
DOCs/
  README.md                 # Índice (siempre bilingüe)
  00-docs-management.md     # Este archivo — manejo de docs
  01-collaboration-rules.md # Reglas para humanos + IA
  02-master-plan.md         # Plan maestro de producto (fusionado)
  archive/                  # Instantáneas congeladas de lo construido / planes previos
    YYYY-MM-DD-titulo-corto.md
```

### Idioma (obligatorio)

- Todo doc nuevo o actualizado bajo `DOCs/` **debe** incluir **inglés y español**.
- Formato preferido: un archivo con `## English` seguido de `## Español` (misma estructura, mismos encabezados).
- Los strings de la UI ya usan `i18n.ts` (`es` + `en`). Los docs siguen el mismo contrato bilingüe.
- Si no puedes completar ambos idiomas en un pase, **no des por cerrado** el doc — termina ambas secciones o deja un `TODO(i18n)` marcado y ciérralo antes de considerar el PR listo.
- Los mensajes de commit pueden ser EN o ES; las descripciones de PR que toquen producto/docs deben resumir en **ambos** idiomas (breve está bien).

### Cuándo escribir o actualizar un doc

| Situación | Acción |
|-----------|--------|
| Nueva decisión de producto (audiencias, split de apps, pedagogía) | Actualizar `02-master-plan.md` |
| Nueva norma de ingeniería (commits, deploy, tests) | Actualizar `01-collaboration-rules.md` |
| Feature sustancial entregada o arquitectura reemplazada | Añadir archivo fechado en `archive/` describiendo *qué existía* y *qué cambió* |
| Spike experimental abandonado | Archivar una nota corta; no borrar historia sin motivo |
| Solo refactors de código, sin cambio de intención | No hace falta actualizar docs |

### Reglas del archivo (`DOCs/archive/`)

- **Archivar = congelar, no reescribir la historia.** La realidad nueva va en docs vivos; la realidad vieja va a `archive/`.
- Nombre: `YYYY-MM-DD-titulo-en-kebab.md`.
- Cada archivo de archive debe indicar:
  1. Fecha
  2. Qué era cierto / estaba construido en ese momento
  3. Por qué se archivó (reemplazado, split en 3 apps, etc.)
  4. Enlaces a los docs vivos actuales
- Nunca borrar archivos de archive para “limpiar” salvo que el usuario lo pida explícitamente.
- La primera entrada documenta el prototipo **monolítico pre–tres-apps** (switcher de modos).

### Estilo de escritura

- Específico y accionable. Preferir tablas y checklists sobre ensayos.
- No duplicar bloques grandes de código — enlazar rutas (`app/src/...`, `worker/src/...`).
- Marcar preguntas abiertas como `Open question / Pregunta abierta`.
- Marcar no negociables como `MUST / OBLIGATORIO`.

### Propiedad

- Humanos e IAs pueden proponer ediciones de docs.
- Si hay conflicto de dirección de producto: parar y preguntar al usuario; no sobrescribir en silencio `02-master-plan.md`.
- Cambios de docs que redefinan audiencias o destruyan intención archivada requieren aprobación explícita del usuario.

### Checklist antes de cerrar un cambio de docs

- [ ] Sección English completa
- [ ] Sección Español completa (mismos encabezados)
- [ ] Enlaces desde `DOCs/README.md` siguen válidos
- [ ] Si se reemplaza un plan viejo, archivar el estado anterior primero
