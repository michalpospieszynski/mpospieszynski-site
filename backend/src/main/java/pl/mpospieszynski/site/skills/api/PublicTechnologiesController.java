package pl.mpospieszynski.site.skills.api;

import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.web.PublicCaching;
import pl.mpospieszynski.site.skills.domain.TechnologyCatalog;

@RestController
@RequestMapping("/api/v1/public/technologies")
class PublicTechnologiesController {

    /** One entry of the project filter. */
    record TechnologyOption(String slug, String name, String category, int projectCount) {
    }

    private final TechnologyCatalog catalog;

    PublicTechnologiesController(TechnologyCatalog catalog) {
        this.catalog = catalog;
    }

    /** `lang` is accepted like on every public read; names are proper nouns and the same in both languages. */
    @Operation(operationId = "listPublicTechnologies", summary = "Technologies used by published projects, with counts")
    @GetMapping
    ResponseEntity<List<TechnologyOption>> list(@RequestParam(defaultValue = "pl") SiteLocale lang) {
        List<TechnologyOption> options = catalog.usedByPublishedProjects().stream()
                .map(t -> new TechnologyOption(t.slug(), t.name(), t.category(), t.projectCount()))
                .toList();
        return ResponseEntity.ok().cacheControl(PublicCaching.READ).body(options);
    }
}
