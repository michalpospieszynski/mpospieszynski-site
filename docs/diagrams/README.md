# Diagrams

| Diagram | UML source (PlantUML) | Mermaid source | Rendered |
|---|---|---|---|
| System context | – | `system-context.mmd` | `system-context.svg` |
| Deployment | `deployment.puml` | `deployment-vps.mmd` | `deployment-vps.svg` |
| Components | `components.puml` | – | render with PlantUML |
| Domain model / ER | `domain.puml` | `er-model.mmd` | `er-model.svg` |
| Page request in a chosen language (SSR) | `sequence-page-request.puml` | – | render with PlantUML |
| Admin sign-in | `sequence-admin-auth.puml` | `sequence-admin-auth.mmd` | `sequence-admin-auth.svg` |
| Contact form | `sequence-contact.puml` | `sequence-contact.mmd` | `sequence-contact.svg` |
| CI/CD | – | `ci-cd.mmd` | `ci-cd.svg` |
| Sitemap (PL / EN / admin) | – | `sitemap.mmd` | `sitemap.svg` |
| Implementation order | – | `implementation-order.mmd` | `implementation-order.svg` |

All PlantUML elements use unique, prefixed aliases (`n_` node, `a_` artifact, `c_` component, `cl_` cloud, `db_` database, `p_` participant). An alias must never repeat a name used elsewhere in the same file; that collision is what broke the previous `deployment.puml`.

Render PlantUML with the IntelliJ or VS Code PlantUML plugin, or:

```bash
docker run --rm -v "$PWD":/data plantuml/plantuml -tsvg /data/*.puml
```

Re-render Mermaid with `npx @mermaid-js/mermaid-cli -i file.mmd -o file.svg`.
