package pl.mpospieszynski.site.projects.api;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import pl.mpospieszynski.site.projects.domain.ProjectKind;
import pl.mpospieszynski.site.projects.domain.ProjectSummary;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.storage.MediaRef;

/** One row of GET /api/v1/public/projects (docs/screens/public/03-projects-list.md, Data). */
public record ProjectListItem(
        UUID id,
        SiteLocale lang,
        String slug,
        SlugTranslations translations,
        String title,
        String summary,
        String role,
        ProjectKind kind,
        boolean featured,
        LocalDate startedOn,
        LocalDate finishedOn,
        MediaRef cover,
        List<TechnologyTag> technologies) {

    /** The project's slug in each language; `en` is null for Polish-only projects. */
    public record SlugTranslations(String pl, String en) {
    }

    public record TechnologyTag(String slug, String name) {
    }

    static ProjectListItem from(ProjectSummary p) {
        return new ProjectListItem(p.id(), p.lang(), p.slug(), new SlugTranslations(p.plSlug(), p.enSlug()),
                p.title(), p.summary(), p.role(), p.kind(), p.featured(), p.startedOn(), p.finishedOn(), p.cover(),
                p.technologies().stream().map(t -> new TechnologyTag(t.slug(), t.name())).toList());
    }
}
