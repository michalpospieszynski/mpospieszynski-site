package pl.mpospieszynski.site.skills.domain;

import java.util.List;
import java.util.UUID;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/** Everything the skills page shows, in one language (docs/screens/public/05-skills.md, Data). */
public record Skills(List<Area> areas, List<Category> categories) {

    public record Area(UUID id, SiteLocale lang, String title, String summary, String descriptionMd,
                       List<TechnologyRef> technologies, List<ProjectRef> projects) {
    }

    public record TechnologyRef(String slug, String name) {
    }

    public record ProjectRef(String slug, SiteLocale lang, String title) {
    }

    public record Category(TechnologyCategory category, List<Technology> technologies) {
    }

    /** `descriptionLang` is null when there is no description at all. */
    public record Technology(String slug, String name, String description, SiteLocale descriptionLang, Integer sinceYear,
                             int projectCount) {
    }
}
