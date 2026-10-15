package pl.mpospieszynski.site.projects.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.storage.MediaRef;

/** A published project as lists show it; texts are in `lang` (the requested language or the Polish fallback). */
public record ProjectSummary(
        UUID id,
        SiteLocale lang,
        String slug,
        String plSlug,
        String enSlug,
        String title,
        String summary,
        String role,
        ProjectKind kind,
        boolean featured,
        LocalDate startedOn,
        LocalDate finishedOn,
        MediaRef cover,
        List<TechnologyRef> technologies) {

    public record TechnologyRef(String slug, String name) {
    }
}
