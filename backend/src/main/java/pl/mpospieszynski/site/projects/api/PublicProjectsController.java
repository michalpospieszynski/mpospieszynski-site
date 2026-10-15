package pl.mpospieszynski.site.projects.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.projects.domain.ProjectCatalog;
import pl.mpospieszynski.site.projects.domain.ProjectKind;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.web.PublicCaching;

@RestController
@RequestMapping("/api/v1/public/projects")
class PublicProjectsController {

    private final ProjectCatalog catalog;

    PublicProjectsController(ProjectCatalog catalog) {
        this.catalog = catalog;
    }

    @Operation(operationId = "listPublicProjects", summary = "Published projects, featured first, optionally filtered")
    @GetMapping
    ResponseEntity<List<ProjectListItem>> list(
            @RequestParam(defaultValue = "pl") SiteLocale lang,
            @Parameter(description = "CLIENT, PERSONAL or OPEN_SOURCE; other values are ignored")
            @RequestParam(required = false) String kind,
            @Parameter(description = "Technology slug; unknown slugs are ignored")
            @RequestParam(required = false) String tech,
            @RequestParam(required = false) Boolean featured) {
        List<ProjectListItem> items = catalog.list(lang, ProjectKind.parse(kind).orElse(null), blankToNull(tech), featured)
                .stream().map(ProjectListItem::from).toList();
        return ResponseEntity.ok().cacheControl(PublicCaching.READ).body(items);
    }

    @Operation(operationId = "getPublicProject",
            summary = "Case study by its slug in that language; 404 when no published project has it")
    @GetMapping("/{slug}")
    ResponseEntity<ProjectDetail> detail(@PathVariable String slug, @RequestParam(defaultValue = "pl") SiteLocale lang) {
        return ResponseEntity.ok().cacheControl(PublicCaching.READ).body(ProjectDetail.from(catalog.detail(lang, slug)));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
