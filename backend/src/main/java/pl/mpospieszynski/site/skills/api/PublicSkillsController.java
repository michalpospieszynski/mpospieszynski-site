package pl.mpospieszynski.site.skills.api;

import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.web.PublicCaching;
import pl.mpospieszynski.site.skills.domain.Skills;
import pl.mpospieszynski.site.skills.domain.SkillsCatalog;
import pl.mpospieszynski.site.skills.domain.TechnologyCategory;

@RestController
@RequestMapping("/api/v1/public/skills")
class PublicSkillsController {

    /** GET /api/v1/public/skills (docs/screens/public/05-skills.md, Data). */
    record SkillsResponse(List<ExpertiseArea> areas, List<TechnologyGroup> categories) {
    }

    record ExpertiseArea(UUID id, SiteLocale lang, String title, String summary, String descriptionMd,
                         List<AreaTechnology> technologies, List<EvidenceProject> projects) {
    }

    record AreaTechnology(String slug, String name) {
    }

    /** A published project proving the area; `lang` is the language of its title and case study. */
    record EvidenceProject(String slug, SiteLocale lang, String title) {
    }

    record TechnologyGroup(TechnologyCategory category, List<SkillTechnology> technologies) {
    }

    record SkillTechnology(String slug, String name, String description, SiteLocale descriptionLang, Integer sinceYear,
                           int projectCount) {
    }

    private final SkillsCatalog catalog;

    PublicSkillsController(SkillsCatalog catalog) {
        this.catalog = catalog;
    }

    @Operation(operationId = "getPublicSkills", summary = "Expertise areas with evidence, and technologies by category")
    @GetMapping
    ResponseEntity<SkillsResponse> skills(@RequestParam(defaultValue = "pl") SiteLocale lang) {
        return ResponseEntity.ok().cacheControl(PublicCaching.READ).body(from(catalog.skills(lang)));
    }

    private static SkillsResponse from(Skills skills) {
        return new SkillsResponse(
                skills.areas().stream().map(a -> new ExpertiseArea(a.id(), a.lang(), a.title(), a.summary(), a.descriptionMd(),
                        a.technologies().stream().map(t -> new AreaTechnology(t.slug(), t.name())).toList(),
                        a.projects().stream().map(p -> new EvidenceProject(p.slug(), p.lang(), p.title())).toList())).toList(),
                skills.categories().stream().map(c -> new TechnologyGroup(c.category(),
                        c.technologies().stream().map(t -> new SkillTechnology(t.slug(), t.name(), t.description(),
                                t.descriptionLang(), t.sinceYear(), t.projectCount())).toList())).toList());
    }
}
